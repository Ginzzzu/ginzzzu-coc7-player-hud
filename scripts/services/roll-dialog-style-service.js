import {
  BODY_CLASSES,
  MODULE_ID,
  SETTINGS,
  SYSTEM_ID
} from "../constants.js";

export class RollDialogStyleService {
  static register() {
    game.settings.register(MODULE_ID, SETTINGS.STYLE_ROLL_DIALOGS, {
      name: "GINZZZU_C7PH.Settings.RollDialogStyle.Name",
      hint: "GINZZZU_C7PH.Settings.RollDialogStyle.Hint",
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
      onChange: (enabled) => this.apply(enabled)
    });
  }

  static apply(enabled = this.isEnabled()) {
    const shouldApply = game.system?.id === SYSTEM_ID && Boolean(enabled);
    document.body?.classList.toggle(BODY_CLASSES.STYLE_ROLL_DIALOGS, shouldApply);
  }

  static isEnabled() {
    return game.settings.get(MODULE_ID, SETTINGS.STYLE_ROLL_DIALOGS) !== false;
  }
}
