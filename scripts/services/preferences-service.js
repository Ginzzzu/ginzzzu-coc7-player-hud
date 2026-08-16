import {
  COMPACT_DISPLAY_MODE,
  MODULE_ID,
  PREFERENCES_SCHEMA_VERSION,
  SECTIONS,
  SETTINGS
} from "../constants.js";
import { PlayerHudPreferences } from "../models/player-hud-preferences.js";

const MAX_RECENT_SKILLS = 8;
const VALID_SECTIONS = new Set(Object.values(SECTIONS));

export class PreferencesService {
  static createDefault() {
    return new PlayerHudPreferences({
      schemaVersion: PREFERENCES_SCHEMA_VERSION
    });
  }

  static register() {
    const defaultPreferences = this.createDefault();

    game.settings.register(MODULE_ID, SETTINGS.PREFERENCES, {
      name: "GINZZZU_C7PH.Settings.Preferences.Name",
      hint: "GINZZZU_C7PH.Settings.Preferences.Hint",
      scope: "client",
      config: false,
      type: PlayerHudPreferences,
      default: defaultPreferences.toObject()
    });
  }

  static get() {
    const stored = game.settings.get(MODULE_ID, SETTINGS.PREFERENCES);
    const preferences = stored instanceof PlayerHudPreferences
      ? stored
      : new PlayerHudPreferences(stored ?? {});

    return this.#normalize(preferences);
  }

  static async clearRecentSkills() {
    return this.update({recentSkillUuids: []});
  }

  static async rememberRecentSkill(uuid) {
    return this.rememberRecentSkills([uuid]);
  }

  static async rememberRecentSkills(uuids = []) {
    const additions = this.#normalizeStringArray(uuids);
    if (!additions.length) return this.get();

    const current = this.get();
    const additionSet = new Set(additions);
    const recentSkillUuids = [
      ...additions,
      ...current.recentSkillUuids.filter((entry) => !additionSet.has(entry))
    ].slice(0, MAX_RECENT_SKILLS);

    return this.update({recentSkillUuids});
  }

  static async toggleFavoriteSkill(uuid) {
    if (!uuid) return this.get();

    const current = this.get();
    const favorites = new Set(current.favoriteSkillUuids);
    if (favorites.has(uuid)) favorites.delete(uuid);
    else favorites.add(uuid);

    return this.update({favoriteSkillUuids: [...favorites]});
  }

  static async update(changes = {}) {
    const current = this.get().toObject();
    const next = this.#normalize(new PlayerHudPreferences({
      ...current,
      ...changes,
      schemaVersion: PREFERENCES_SCHEMA_VERSION
    }));

    await game.settings.set(MODULE_ID, SETTINGS.PREFERENCES, next.toObject());
    return next;
  }

  static #normalize(preferences) {
    const source = preferences.toObject();
    const activeSection = VALID_SECTIONS.has(source.activeSection)
      ? source.activeSection
      : null;
    const displayMode = COMPACT_DISPLAY_MODE;
    const favoriteSkillUuids = this.#normalizeStringArray(source.favoriteSkillUuids);
    const recentSkillUuids = this.#normalizeStringArray(source.recentSkillUuids)
      .slice(0, MAX_RECENT_SKILLS);

    if (
      activeSection === source.activeSection
      && displayMode === source.displayMode
      && this.#arraysEqual(favoriteSkillUuids, source.favoriteSkillUuids)
      && this.#arraysEqual(recentSkillUuids, source.recentSkillUuids)
      && source.schemaVersion === PREFERENCES_SCHEMA_VERSION
    ) {
      return preferences;
    }

    return new PlayerHudPreferences({
      ...source,
      activeSection,
      displayMode,
      favoriteSkillUuids,
      recentSkillUuids,
      schemaVersion: PREFERENCES_SCHEMA_VERSION
    });
  }

  static #arraysEqual(left, right) {
    if (!Array.isArray(right) || left.length !== right.length) return false;
    return left.every((entry, index) => entry === right[index]);
  }

  static #normalizeStringArray(value) {
    if (!Array.isArray(value)) return [];

    return [...new Set(value.filter((entry) => typeof entry === "string" && entry.length > 0))];
  }
}
