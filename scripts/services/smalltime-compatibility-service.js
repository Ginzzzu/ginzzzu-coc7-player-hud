import { BODY_CLASSES, MODULE_ID } from "../constants.js";

const SMALLTIME_ID = "smalltime";
const POSITION_MARGIN = 12;
const POSITION_OFFSET_Y = 12;

let registered = false;
let syncPromise = null;
let syncTimer = null;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function shouldDetach() {
  return (
    !game.user?.isGM
    && document.body?.classList.contains(BODY_CLASSES.ACTIVE)
    && !document.body.classList.contains(BODY_CLASSES.CORE_VISIBLE)
  );
}

function smallTimeModule() {
  const module = game.modules.get(SMALLTIME_ID);
  return module?.active ? module : null;
}

function detachedPosition(element) {
  const rect = element.getBoundingClientRect();
  const saved = game.settings.get(SMALLTIME_ID, "position") ?? {};
  const width = rect.width > 0 ? rect.width : 200;
  const height = rect.height > 0 ? rect.height : 58;
  const baseLeft = Number.isFinite(rect.left) ? rect.left : Number(saved.left) || POSITION_MARGIN;
  const baseTop = Number.isFinite(rect.top) ? rect.top : Number(saved.top) || POSITION_MARGIN;
  const maximumLeft = Math.max(POSITION_MARGIN, globalThis.innerWidth - width - POSITION_MARGIN);
  const maximumTop = Math.max(POSITION_MARGIN, globalThis.innerHeight - height - POSITION_MARGIN);

  return {
    left: Math.round(clamp(baseLeft, POSITION_MARGIN, maximumLeft)),
    top: Math.round(clamp(baseTop - POSITION_OFFSET_Y, POSITION_MARGIN, maximumTop))
  };
}

async function detachSmallTime() {
  if (!shouldDetach()) return null;

  const module = smallTimeModule();
  const application = module?.myApp;
  const element = application?.element ?? document.getElementById("smalltime-app");
  if (!application || !element) return null;

  const pinned = game.settings.get(SMALLTIME_ID, "pinned");
  if (!pinned && !element.classList.contains("pinned")) return null;

  const unpin = globalThis.SmallTimeApp?.unPinApp;
  if (typeof unpin !== "function") return null;

  const position = detachedPosition(element);
  await game.settings.set(SMALLTIME_ID, "pinned", false);
  unpin.call(globalThis.SmallTimeApp);
  application.setPosition(position);
  await game.settings.set(SMALLTIME_ID, "position", position);
  return position;
}

export function requestSmallTimeCompatibility({delay = 0} = {}) {
  if (syncTimer !== null) globalThis.clearTimeout(syncTimer);

  syncTimer = globalThis.setTimeout(() => {
    syncTimer = null;
    syncPromise ??= detachSmallTime().finally(() => {
      syncPromise = null;
    });
    void syncPromise.catch((error) => {
      console.error(`${MODULE_ID} | Failed to detach SmallTime from the player list`, error);
    });
  }, delay);
}

export function registerSmallTimeCompatibilityHooks() {
  if (registered) return;
  registered = true;

  Hooks.on("renderSmallTimeApp", () => {
    try {
      requestSmallTimeCompatibility();
    } catch (error) {
      console.error(`${MODULE_ID} | SmallTime render hook failed`, error);
    }
  });

  Hooks.on("canvasReady", () => {
    try {
      requestSmallTimeCompatibility();
    } catch (error) {
      console.error(`${MODULE_ID} | SmallTime canvas hook failed`, error);
    }
  });

  requestSmallTimeCompatibility();
}
