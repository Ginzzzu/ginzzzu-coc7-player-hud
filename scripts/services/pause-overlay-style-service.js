import {
  BODY_CLASSES,
  MODULE_ID,
  SETTINGS,
  SYSTEM_ID
} from "../constants.js";

const PAUSE_SELECTOR = "#pause";
const CAPTION_SELECTOR = "figcaption";
const PAUSE_TEXT_KEY = "GINZZZU_C7PH.PauseOverlay.Text";

export class PauseOverlayStyleService {
  static #renderHookId = null;
  static #pauseHookId = null;
  static #originalCaptionNodes = new WeakMap();

  static register() {
    game.settings.register(MODULE_ID, SETTINGS.STYLE_PAUSE_OVERLAY, {
      name: "GINZZZU_C7PH.Settings.PauseOverlayStyle.Name",
      hint: "GINZZZU_C7PH.Settings.PauseOverlayStyle.Hint",
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
      onChange: (enabled) => this.apply(enabled)
    });

    if (this.#renderHookId === null) {
      this.#renderHookId = Hooks.on("renderGamePause", (_application, element) => {
        try {
          const overlay = this.#syncOverlay(element, this.isEnabled(), {captureOriginal: true});
          this.#syncActiveState(overlay, Boolean(game.paused));
        } catch (error) {
          console.error(`${MODULE_ID} | Failed to style the pause overlay`, error);
        }
      });
    }

    if (this.#pauseHookId === null) {
      this.#pauseHookId = Hooks.on("pauseGame", (paused) => {
        try {
          const shouldApply = game.system?.id === SYSTEM_ID && this.isEnabled();
          const overlay = this.#syncOverlay(document.querySelector(PAUSE_SELECTOR), shouldApply);
          this.#syncActiveState(overlay, Boolean(paused));
        } catch (error) {
          console.error(`${MODULE_ID} | Failed to animate the pause overlay`, error);
        }
      });
    }
  }

  static apply(enabled = this.isEnabled()) {
    const shouldApply = game.system?.id === SYSTEM_ID && Boolean(enabled);
    document.body?.classList.toggle(BODY_CLASSES.STYLE_PAUSE_OVERLAY, shouldApply);

    const overlay = this.#syncOverlay(document.querySelector(PAUSE_SELECTOR), shouldApply);
    this.#syncActiveState(overlay, shouldApply && Boolean(game.paused));
  }

  static isEnabled() {
    return game.settings.get(MODULE_ID, SETTINGS.STYLE_PAUSE_OVERLAY) !== false;
  }

  static #syncOverlay(element, enabled = this.isEnabled(), {captureOriginal = false} = {}) {
    const overlay = this.#resolveOverlay(element);
    if (!overlay) return null;

    const shouldApply = game.system?.id === SYSTEM_ID && Boolean(enabled);
    overlay.classList.toggle(BODY_CLASSES.PAUSE_OVERLAY, shouldApply);
    if (!shouldApply) overlay.classList.remove(BODY_CLASSES.PAUSE_OVERLAY_ACTIVE);

    const caption = overlay.querySelector(CAPTION_SELECTOR);
    if (!caption) return overlay;

    if (!shouldApply) {
      if (captureOriginal) this.#originalCaptionNodes.delete(caption);
      else this.#restoreCaption(caption);
      return overlay;
    }

    if (captureOriginal || !this.#originalCaptionNodes.has(caption)) {
      this.#originalCaptionNodes.set(
        caption,
        [...caption.childNodes].map((node) => node.cloneNode(true))
      );
    }

    caption.replaceChildren(document.createTextNode(game.i18n.localize(PAUSE_TEXT_KEY)));
    return overlay;
  }

  static #syncActiveState(overlay, active) {
    overlay?.classList.toggle(
      BODY_CLASSES.PAUSE_OVERLAY_ACTIVE,
      Boolean(active) && overlay.classList.contains(BODY_CLASSES.PAUSE_OVERLAY)
    );
  }

  static #resolveOverlay(element) {
    if (element?.matches?.(PAUSE_SELECTOR)) return element;
    return element?.querySelector?.(PAUSE_SELECTOR) ?? document.querySelector(PAUSE_SELECTOR);
  }

  static #restoreCaption(caption) {
    const originalNodes = this.#originalCaptionNodes.get(caption);
    if (!originalNodes) return;

    caption.replaceChildren(...originalNodes.map((node) => node.cloneNode(true)));
    this.#originalCaptionNodes.delete(caption);
  }
}
