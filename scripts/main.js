import {
  APP_ID,
  MODULE_ID,
  SYSTEM_ID
} from "./constants.js";
import { PlayerHud } from "./applications/player-hud.js";
import { InvestigatorWizard } from "./creation/applications/investigator-wizard.js";
import { KeeperCreationMonitor } from "./keeper/applications/keeper-creation-monitor.js";
import { preloadCreationTemplates } from "./creation/templates.js";
import { registerPlayerHudHooks } from "./hooks.js";
import {
  registerKeeperMonitorControl,
  registerKeeperMonitorHooks
} from "./keeper/hooks.js";
import { KEEPER_MONITOR_APP_ID } from "./keeper/constants.js";
import { registerKeybindings } from "./keybindings.js";
import { InvestigatorActorRepairService } from "./creation/services/investigator-actor-repair-service.js";
import { ActorResolverService } from "./services/actor-resolver-service.js";
import { AmmoService } from "./services/ammo-service.js";
import { PreferencesService } from "./services/preferences-service.js";
import { PauseOverlayStyleService } from "./services/pause-overlay-style-service.js";
import { RollDialogStyleService } from "./services/roll-dialog-style-service.js";
import { ChatStyleService } from "./services/chat-style-service.js";
import { registerSmallTimeCompatibilityHooks } from "./services/smalltime-compatibility-service.js";
import { UiVisibilityService } from "./services/ui-visibility-service.js";
import { Coc7InteractionProvider, connectCoc7InteractionProvider, registerCoc7InteractionProvider } from "./interactions/coc7-interaction-provider.js";

function getApplication() {
  return foundry.applications.instances.get(APP_ID) ?? null;
}

function getKeeperApplication() {
  return foundry.applications.instances.get(KEEPER_MONITOR_APP_ID) ?? null;
}



async function openPlayerHud() {
  if (game.system.id !== SYSTEM_ID) return null;

  const existing = getApplication();
  if (existing) {
    await existing.render({force: true});
    return existing;
  }

  const application = new PlayerHud();
  await application.render({force: true});
  return application;
}


async function openKeeperMonitor() {
  if (game.system.id !== SYSTEM_ID || !game.user?.isGM) return null;
  return KeeperCreationMonitor.open();
}

async function toggleKeeperMonitor() {
  return openKeeperMonitor();
}

async function closePlayerHud() {
  const application = getApplication();
  if (application) await application.close();
  else UiVisibilityService.deactivate();
}

async function togglePlayerHud() {
  const application = getApplication();
  if (application) {
    await closePlayerHud();
    return null;
  }

  return openPlayerHud();
}

Hooks.once("init", async () => {
  try {
    registerKeeperMonitorControl({toggleApplication: toggleKeeperMonitor});
    registerCoc7InteractionProvider();
    await preloadCreationTemplates();
    PreferencesService.register();
    RollDialogStyleService.register();
    PauseOverlayStyleService.register();
    ChatStyleService.register();
    registerKeybindings({getApplication});
  } catch (error) {
    console.error(`${MODULE_ID} | Initialization failed`, error);
  }
});

Hooks.once("ready", async () => {
  try {
    RollDialogStyleService.apply();
    PauseOverlayStyleService.apply();
    ChatStyleService.apply();
    connectCoc7InteractionProvider();
    const module = game.modules.get(MODULE_ID);
    if (module) {
      module.api = Object.freeze({
        close: closePlayerHud,
        open: openPlayerHud,
        openCreation: () => InvestigatorWizard.open(),
        openKeeperMonitor,
        interactionProvider: Coc7InteractionProvider,
        toggle: togglePlayerHud,
        get actor() {
          return ActorResolverService.resolve().actor;
        },
        get application() {
          return getApplication();
        }
      });
    }

    if (game.system.id !== SYSTEM_ID) {
      ui.notifications.error(game.i18n.localize("GINZZZU_C7PH.Errors.WrongSystem"));
      return;
    }

    AmmoService.registerHooks();
    registerPlayerHudHooks({getApplication});
    registerSmallTimeCompatibilityHooks();
    if (game.user?.isGM) registerKeeperMonitorHooks({getApplication: getKeeperApplication});

    try {
      const repair = await InvestigatorActorRepairService.repairAssignedActor();
      if (repair.deleted > 0) {
        ui.notifications.info(game.i18n.format(
          "GINZZZU_C7PH.Creation.Repair.DuplicatesRemoved",
          {count: repair.deleted}
        ));
      }
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to repair legacy investigator data`, error);
    }

    if (game.user?.isGM) return;

    void openPlayerHud().catch((error) => {
      console.error(`${MODULE_ID} | Failed to open player HUD`, error);
      UiVisibilityService.deactivate();
      ui.notifications.error(game.i18n.localize("GINZZZU_C7PH.Errors.Open"));
    });
  } catch (error) {
    console.error(`${MODULE_ID} | Ready hook failed`, error);
    UiVisibilityService.deactivate();
  }
});
