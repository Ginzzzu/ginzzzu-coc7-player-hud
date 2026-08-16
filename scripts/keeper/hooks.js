import { MODULE_ID } from "../constants.js";
import {
  KEEPER_MONITOR_CONTROL,
  KEEPER_MONITOR_TOOL
} from "./constants.js";

let hooksRegistered = false;
let refreshTimer = null;
let previousSceneControl = null;
let previousSceneTool = null;

function requestRefresh(getApplication) {
  if (refreshTimer !== null) globalThis.clearTimeout(refreshTimer);
  refreshTimer = globalThis.setTimeout(() => {
    refreshTimer = null;
    const application = getApplication();
    if (!application) return;

    void application.refresh({preserveView: true}).catch((error) => {
      console.error(`${MODULE_ID} | Failed to refresh Keeper creation monitor`, error);
    });
  }, 100);
}

function rememberSceneControl(sceneControls = ui.controls) {
  const controlName = sceneControls?.control?.name;
  if (!controlName || controlName === KEEPER_MONITOR_CONTROL) return;

  previousSceneControl = controlName;
  previousSceneTool = sceneControls.tool?.name ?? null;
}

async function restoreSceneControl() {
  const sceneControls = ui.controls;
  if (!sceneControls || sceneControls.control?.name !== KEEPER_MONITOR_CONTROL) return;

  const controls = sceneControls.controls ?? {};
  const fallbackControl = previousSceneControl && controls[previousSceneControl]
    ? previousSceneControl
    : Object.values(controls).find((control) => (
      control?.name !== KEEPER_MONITOR_CONTROL
      && control?.visible !== false
    ))?.name;

  if (!fallbackControl) return;

  const options = {control: fallbackControl};
  const fallbackTools = controls[fallbackControl]?.tools ?? {};
  if (previousSceneTool && fallbackTools[previousSceneTool]) options.tool = previousSceneTool;

  await sceneControls.activate(options);
}

async function openMonitor(toggleApplication) {
  rememberSceneControl();

  try {
    await toggleApplication();
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to open Keeper creation monitor`, error);
    ui.notifications.error(game.i18n.localize("GINZZZU_C7PH.Keeper.Errors.Open"));
  } finally {
    try {
      await restoreSceneControl();
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to restore the previous scene control`, error);
    }
  }
}

function createTool(toggleApplication, {legacy = false} = {}) {
  const tool = {
    name: KEEPER_MONITOR_TOOL,
    title: "GINZZZU_C7PH.Keeper.ControlTitle",
    icon: "fa-solid fa-users-viewfinder",
    order: 0,
    button: true,
    visible: Boolean(game.user?.isGM),
    onChange: (_event, active) => {
      if (active === false) return;
      void openMonitor(toggleApplication);
    }
  };

  if (legacy) {
    tool.onClick = () => {
      void openMonitor(toggleApplication);
    };
    delete tool.onChange;
  }

  return tool;
}

function createControl(toggleApplication, {legacy = false} = {}) {
  const tool = createTool(toggleApplication, {legacy});
  return {
    name: KEEPER_MONITOR_CONTROL,
    title: "GINZZZU_C7PH.Keeper.ControlTitle",
    icon: "fa-solid fa-users-viewfinder",
    order: 13,
    activeTool: KEEPER_MONITOR_TOOL,
    visible: Boolean(game.user?.isGM),
    tools: legacy ? [tool] : {[KEEPER_MONITOR_TOOL]: tool}
  };
}

export function registerKeeperMonitorControl({toggleApplication}) {
  Hooks.on("renderSceneControls", (application) => {
    try {
      rememberSceneControl(application);
    } catch (error) {
      console.error(`${MODULE_ID} | renderSceneControls hook failed`, error);
    }
  });

  Hooks.on("getSceneControlButtons", (controls) => {
    try {
      if (!game.user?.isGM) return;

      if (Array.isArray(controls)) {
        controls.push(createControl(toggleApplication, {legacy: true}));
        return;
      }

      controls[KEEPER_MONITOR_CONTROL] = createControl(toggleApplication);
    } catch (error) {
      console.error(`${MODULE_ID} | getSceneControlButtons hook failed`, error);
    }
  });
}

export function registerKeeperMonitorHooks({getApplication}) {
  if (hooksRegistered) return;
  hooksRegistered = true;

  for (const hookName of ["createActor", "deleteActor", "updateActor"]) {
    Hooks.on(hookName, (actor) => {
      try {
        if (actor.type === "character") requestRefresh(getApplication);
      } catch (error) {
        console.error(`${MODULE_ID} | Keeper ${hookName} hook failed`, error);
      }
    });
  }

  Hooks.on("updateUser", (user) => {
    try {
      if (!user.isGM) requestRefresh(getApplication);
    } catch (error) {
      console.error(`${MODULE_ID} | Keeper updateUser hook failed`, error);
    }
  });
}
