import { CORE_VOLUME_CONTROLS } from "../constants.js";

const DEFAULT_RESTORE_VOLUME = 0.5;
const CORE_SCOPE = "core";
const SUPPORTED_KEYS = new Set(CORE_VOLUME_CONTROLS.map((control) => control.key));

export class VolumeService {
  static #lastNonZeroValues = new Map();

  static build() {
    return CORE_VOLUME_CONTROLS.map((control) => {
      const value = this.#read(control.key);
      if (value > 0) this.#lastNonZeroValues.set(control.key, value);

      const label = game.i18n.localize(control.label);
      const percent = Math.round(value * 100);
      const muted = value <= 0;

      return {
        ...control,
        label,
        muted,
        muteTitle: game.i18n.format(
          muted
            ? "GINZZZU_C7PH.Sections.Volume.Unmute"
            : "GINZZZU_C7PH.Sections.Volume.Mute",
          {channel: label}
        ),
        percent,
        tooltip: game.i18n.format("GINZZZU_C7PH.Sections.Volume.Value", {
          channel: label,
          percent
        }),
        value
      };
    });
  }

  static async set(key, value) {
    this.#assertSupported(key);
    const normalized = this.#normalize(value);
    if (normalized > 0) this.#lastNonZeroValues.set(key, normalized);
    await game.settings.set(CORE_SCOPE, key, normalized);
    return normalized;
  }

  static async toggleMute(key) {
    this.#assertSupported(key);
    const current = this.#read(key);

    if (current > 0) {
      this.#lastNonZeroValues.set(key, current);
      await game.settings.set(CORE_SCOPE, key, 0);
      return 0;
    }

    const restored = this.#normalize(
      this.#lastNonZeroValues.get(key) ?? DEFAULT_RESTORE_VOLUME
    );
    await game.settings.set(CORE_SCOPE, key, restored);
    return restored;
  }

  static #assertSupported(key) {
    if (!SUPPORTED_KEYS.has(key)) {
      throw new Error(`Unsupported Foundry volume setting: ${key}`);
    }
  }

  static #normalize(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_RESTORE_VOLUME;
    return Math.min(1, Math.max(0, number));
  }

  static #read(key) {
    return this.#normalize(game.settings.get(CORE_SCOPE, key));
  }
}
