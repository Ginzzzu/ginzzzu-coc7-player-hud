import { MODULE_ID } from "./constants.js";
import { UiVisibilityService } from "./services/ui-visibility-service.js";

export function registerKeybindings({getApplication}) {
  game.keybindings.register(MODULE_ID, "toggleCoreInterface", {
    name: "GINZZZU_C7PH.Keybindings.ToggleCoreInterface.Name",
    hint: "GINZZZU_C7PH.Keybindings.ToggleCoreInterface.Hint",
    editable: [
      {
        key: "KeyH",
        modifiers: ["Control", "Shift"]
      }
    ],
    onDown: () => {
      try {
        const application = getApplication();
        if (!application) {
          UiVisibilityService.deactivate();
          return true;
        }

        UiVisibilityService.toggleCoreInterface();
        void application.render({parts: ["main"]}).catch((error) => {
          console.error(`${MODULE_ID} | Failed to refresh after keybinding`, error);
        });
        return true;
      } catch (error) {
        console.error(`${MODULE_ID} | Emergency interface keybinding failed`, error);
        UiVisibilityService.deactivate();
        return true;
      }
    },
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    restricted: false
  });
}
