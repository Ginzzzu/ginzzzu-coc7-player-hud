import { MODULE_ID } from "./constants.js";
import { ActorResolverService } from "./services/actor-resolver-service.js";
import { COC7_CONDITION_IDS } from "./services/conditions-service.js";
import { PreferencesService } from "./services/preferences-service.js";
import { UiVisibilityService } from "./services/ui-visibility-service.js";

const CONDITION_REFRESH_DELAY = 120;
const DEFAULT_REFRESH_DELAY = 50;

let chatRefreshTimer = null;
let registered = false;
let refreshTimer = null;

function requestRefresh(getApplication, {delay = DEFAULT_REFRESH_DELAY} = {}) {
  if (refreshTimer !== null) globalThis.clearTimeout(refreshTimer);

  refreshTimer = globalThis.setTimeout(() => {
    refreshTimer = null;
    const application = getApplication();
    if (!application) return;

    const refresh = typeof application.refreshFromHook === "function"
      ? application.refreshFromHook()
      : application.render({parts: ["main"]});

    void refresh.catch((error) => {
      console.error(`${MODULE_ID} | Failed to refresh player HUD`, error);
    });
  }, delay);
}

function requestChatRefresh(getApplication, {delay = DEFAULT_REFRESH_DELAY} = {}) {
  if (chatRefreshTimer !== null) globalThis.clearTimeout(chatRefreshTimer);

  chatRefreshTimer = globalThis.setTimeout(() => {
    chatRefreshTimer = null;
    const application = getApplication();
    if (!application || typeof application.refreshChatFromHook !== "function") return;

    void application.refreshChatFromHook().catch((error) => {
      console.error(`${MODULE_ID} | Failed to refresh recent chat preview`, error);
    });
  }, delay);
}

function activeEffectActor(effect) {
  if (effect?.parent?.documentName === "Actor") return effect.parent;
  if (effect?.parent?.documentName === "Item") return embeddedItemActor(effect.parent);
  return null;
}

function embeddedItemActor(item) {
  return item?.parent?.documentName === "Actor" ? item.parent : null;
}

function actorChangeTouchesConditions(changed) {
  if (!changed || typeof changed !== "object") return false;
  if (changed.system?.conditions) return true;
  return Object.keys(changed).some((key) => key.startsWith("system.conditions."));
}

function isNativeConditionEffect(effect) {
  const statuses = effect?.statuses;
  if (!statuses) return false;
  return COC7_CONDITION_IDS.some((conditionId) => statuses.has?.(conditionId));
}

export function registerPlayerHudHooks({getApplication}) {
  if (registered) return;
  registered = true;

  Hooks.on("canvasReady", () => {
    try {
      const application = getApplication();
      if (!application) return;
      const preferences = PreferencesService.get();
      if (preferences.autoHideInterface) {
        UiVisibilityService.activate({hideCameras: preferences.hideCameras});
      } else {
        UiVisibilityService.deactivate();
      }
      requestRefresh(getApplication);
    } catch (error) {
      console.error(`${MODULE_ID} | canvasReady hook failed`, error);
    }
  });

  Hooks.on("createActor", (actor) => {
    try {
      if (actor.type === "character" && actor.isOwner) requestRefresh(getApplication);
    } catch (error) {
      console.error(`${MODULE_ID} | createActor hook failed`, error);
    }
  });

  Hooks.on("deleteActor", (actor) => {
    try {
      if (actor.type === "character") requestRefresh(getApplication);
    } catch (error) {
      console.error(`${MODULE_ID} | deleteActor hook failed`, error);
    }
  });

  Hooks.on("updateActor", (actor, changed) => {
    try {
      if (!ActorResolverService.isRelevant(actor)) return;
      requestRefresh(getApplication, {
        delay: actorChangeTouchesConditions(changed)
          ? CONDITION_REFRESH_DELAY
          : DEFAULT_REFRESH_DELAY
      });
    } catch (error) {
      console.error(`${MODULE_ID} | updateActor hook failed`, error);
    }
  });

  Hooks.on("updateUser", (user) => {
    try {
      if (user.id === game.user?.id) requestRefresh(getApplication);
    } catch (error) {
      console.error(`${MODULE_ID} | updateUser hook failed`, error);
    }
  });

  Hooks.on("updateSetting", (setting) => {
    try {
      if ([
        "CoC7.statusPlayerEditable",
        "CoC7.disregardAmmo",
        "CoC7.initiativeRule"
      ].includes(setting?.key)) requestRefresh(getApplication);
    } catch (error) {
      console.error(`${MODULE_ID} | updateSetting hook failed`, error);
    }
  });


  for (const hookName of ["createItem", "deleteItem", "updateItem"]) {
    Hooks.on(hookName, (item) => {
      try {
        const hasEffects = (item.effects?.size ?? item.effects?.length ?? 0) > 0;
        if (!["skill", "weapon"].includes(item.type) && !hasEffects) return;
        const actor = embeddedItemActor(item);
        if (ActorResolverService.isRelevant(actor)) requestRefresh(getApplication);
      } catch (error) {
        console.error(`${MODULE_ID} | ${hookName} hook failed`, error);
      }
    });
  }

  Hooks.on("targetToken", (user) => {
    try {
      if (user.id === game.user?.id) requestRefresh(getApplication);
    } catch (error) {
      console.error(`${MODULE_ID} | targetToken hook failed`, error);
    }
  });

  for (const hookName of [
    "createCombat",
    "deleteCombat",
    "updateCombat",
    "combatStart",
    "combatRound",
    "combatTurn",
    "combatEnd",
    "createCombatant",
    "deleteCombatant",
    "updateCombatant"
  ]) {
    Hooks.on(hookName, () => {
      try {
        requestRefresh(getApplication);
      } catch (error) {
        console.error(`${MODULE_ID} | ${hookName} hook failed`, error);
      }
    });
  }

  for (const hookName of ["createChatMessage", "deleteChatMessage", "updateChatMessage"]) {
    Hooks.on(hookName, () => {
      try {
        requestChatRefresh(getApplication);
      } catch (error) {
        console.error(`${MODULE_ID} | ${hookName} hook failed`, error);
      }
    });
  }

  Hooks.on("controlToken", (token) => {
    try {
      if (token?.isOwner) requestRefresh(getApplication);
    } catch (error) {
      console.error(`${MODULE_ID} | controlToken hook failed`, error);
    }
  });

  for (const hookName of ["createToken", "deleteToken"]) {
    Hooks.on(hookName, (tokenDocument) => {
      try {
        if (ActorResolverService.isRelevant(tokenDocument?.actor)) requestRefresh(getApplication);
      } catch (error) {
        console.error(`${MODULE_ID} | ${hookName} hook failed`, error);
      }
    });
  }

  for (const hookName of ["createActiveEffect", "deleteActiveEffect", "updateActiveEffect"]) {
    Hooks.on(hookName, (effect) => {
      try {
        const actor = activeEffectActor(effect);
        if (!ActorResolverService.isRelevant(actor)) return;
        requestRefresh(getApplication, {
          delay: isNativeConditionEffect(effect)
            ? CONDITION_REFRESH_DELAY
            : DEFAULT_REFRESH_DELAY
        });
      } catch (error) {
        console.error(`${MODULE_ID} | ${hookName} hook failed`, error);
      }
    });
  }
}
