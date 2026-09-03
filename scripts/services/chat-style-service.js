import {
  BODY_CLASSES,
  MODULE_ID,
  SETTINGS,
  SYSTEM_ID
} from "../constants.js";

export class ChatStyleService {
  static register() {
    game.settings.register(MODULE_ID, SETTINGS.STYLE_CHAT_MESSAGES, {
      name: "GINZZZU_C7PH.Settings.ChatMessageStyle.Name",
      hint: "GINZZZU_C7PH.Settings.ChatMessageStyle.Hint",
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
      onChange: (enabled) => this.apply(enabled)
    });
  }

  static apply(enabled = this.isEnabled()) {
    const shouldApply = game.system?.id === SYSTEM_ID && Boolean(enabled);
    document.body?.classList.toggle(BODY_CLASSES.STYLE_CHAT_MESSAGES, shouldApply);
  }

  static isEnabled() {
    return game.settings.get(MODULE_ID, SETTINGS.STYLE_CHAT_MESSAGES) !== false;
  }
}
