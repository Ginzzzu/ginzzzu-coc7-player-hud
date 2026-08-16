import { COC7_CONDITION_IDS } from "./conditions-service.js";

const CATEGORY_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "temporary",
    icon: "fa-solid fa-hourglass-half",
    label: "CoC7.Temporary",
    fallback: "GINZZZU_C7PH.Sections.Consequences.Categories.Temporary"
  }),
  Object.freeze({
    id: "passive",
    icon: "fa-solid fa-infinity",
    label: "CoC7.Passive",
    fallback: "GINZZZU_C7PH.Sections.Consequences.Categories.Passive"
  }),
  Object.freeze({
    id: "inactive",
    icon: "fa-solid fa-circle-pause",
    label: "CoC7.Inactive",
    fallback: "GINZZZU_C7PH.Sections.Consequences.Categories.Inactive"
  }),
  Object.freeze({
    id: "suppressed",
    icon: "fa-solid fa-ban",
    label: "CoC7.Suppressed",
    fallback: "GINZZZU_C7PH.Sections.Consequences.Categories.Suppressed"
  }),
  Object.freeze({
    id: "status",
    icon: "fa-solid fa-tags",
    label: "Status",
    fallback: "GINZZZU_C7PH.Sections.Consequences.Categories.Status"
  })
]);

const CHANGE_TYPE_KEYS = Object.freeze({
  add: "GINZZZU_C7PH.Sections.Consequences.ChangeTypes.Add",
  custom: "GINZZZU_C7PH.Sections.Consequences.ChangeTypes.Custom",
  downgrade: "GINZZZU_C7PH.Sections.Consequences.ChangeTypes.Downgrade",
  multiply: "GINZZZU_C7PH.Sections.Consequences.ChangeTypes.Multiply",
  override: "GINZZZU_C7PH.Sections.Consequences.ChangeTypes.Override",
  upgrade: "GINZZZU_C7PH.Sections.Consequences.ChangeTypes.Upgrade"
});

export class ConsequencesService {
  static build(actor) {
    if (!actor) return this.#empty();

    const categories = new Map(CATEGORY_DEFINITIONS.map((definition) => [
      definition.id,
      {
        effects: [],
        icon: definition.icon,
        id: definition.id,
        label: this.#localizedLabel(definition.label, definition.fallback)
      }
    ]));

    const records = [];
    for (const effect of actor.effects ?? []) {
      records.push({effect, embeddedItem: false});
    }

    for (const item of actor.items ?? []) {
      for (const effect of item.effects ?? []) {
        records.push({effect, embeddedItem: true});
      }
    }

    const visibleRecords = records.filter((record) => !this.#isCoc7Condition(record.effect));

    for (const record of visibleRecords) {
      const categoryId = this.#category(record.effect);
      categories.get(categoryId)?.effects.push(
        this.#effectData(actor, record.effect, {embeddedItem: record.embeddedItem})
      );
    }

    const visibleCategories = [...categories.values()]
      .filter((category) => category.effects.length > 0)
      .map((category) => ({
        ...category,
        count: category.effects.length
      }));

    return {
      consequenceCategories: visibleCategories,
      consequenceCount: visibleRecords.length,
      hasConsequences: visibleRecords.length > 0
    };
  }

  static #category(effect) {
    if (effect.isSuppressed) return "suppressed";
    if (this.#isStatus(effect)) return "status";
    if (effect.disabled) return "inactive";
    if (effect.isTemporary) return "temporary";
    return "passive";
  }

  static #effectData(actor, effect, {embeddedItem = false} = {}) {
    const changes = this.#formatChanges(actor, effect);
    const duration = effect.duration?.label
      || game.i18n.localize("GINZZZU_C7PH.Sections.Consequences.Permanent");
    const source = embeddedItem
      ? effect.parent?.name
      : effect.sourceName;
    const safeSource = source
      || game.i18n.localize("GINZZZU_C7PH.Sections.Consequences.UnknownSource");
    const tooltip = [
      effect.name,
      `${game.i18n.localize("GINZZZU_C7PH.Sections.Consequences.Source")}: ${safeSource}`,
      `${game.i18n.localize("GINZZZU_C7PH.Sections.Consequences.Duration")}: ${duration}`,
      ...changes
    ].filter(Boolean).join("\n");

    return {
      changeSummary: changes.join(" · "),
      duration,
      hasChanges: changes.length > 0,
      id: effect.id,
      img: effect.img || "icons/svg/aura.svg",
      name: effect.name,
      source: safeSource,
      tooltip,
      uuid: effect.uuid
    };
  }

  static #formatChanges(actor, effect) {
    const changes = effect.system?.changes ?? effect.changes ?? [];
    return changes.map((change) => this.#formatChange(actor, change));
  }

  static #formatChange(actor, change) {
    const type = change.type ?? "custom";
    const keyLabel = this.#changeKeyLabel(actor, change.key);
    const value = String(change.value ?? "");

    if (type === "add") {
      const prefix = Number(value) > 0 ? "+" : "";
      return `${keyLabel} ${prefix}${value}`;
    }

    if (type === "override") return `${keyLabel} = ${value}`;

    const typeKey = CHANGE_TYPE_KEYS[type] ?? CHANGE_TYPE_KEYS.custom;
    return `${keyLabel}: ${game.i18n.localize(typeKey)} ${value}`.trim();
  }

  static #changeKeyLabel(actor, key = "") {
    const skillMatch = key.match(/^system\.skills\.(i(\.|>>)skill(\.|>>))?(.+)\.system\.(bonusDice|value)$/);
    if (skillMatch) {
      const storedKey = skillMatch[1]
        ? `i>>skill>>${skillMatch[4]}`
        : skillMatch[4];
      const skillName = actor.system?.skills?.[storedKey]?.name
        ?? storedKey.replaceAll(">>", ".");
      return skillMatch[5] === "bonusDice"
        ? `${skillName} — ${game.i18n.localize("GINZZZU_C7PH.Sections.Consequences.BonusDice")}`
        : skillName;
    }

    const actorMatch = key.match(/^system\.(characteristics|attribs|config)\.([^.]+)\.(bonusDice|max|value)$/);
    if (actorMatch) {
      const [, group, field, property] = actorMatch;
      const label = this.#actorFieldLabel(group, field) ?? field;
      if (property === "bonusDice") {
        return `${label} — ${game.i18n.localize("GINZZZU_C7PH.Sections.Consequences.BonusDice")}`;
      }
      if (property === "max") {
        return `${label} — ${game.i18n.localize("GINZZZU_C7PH.Sections.Consequences.Maximum")}`;
      }
      return label;
    }

    return key || game.i18n.localize("GINZZZU_C7PH.Sections.Consequences.UnknownChange");
  }

  static #actorFieldLabel(group, field) {
    if (group === "config") {
      const configLabels = {
        idea: "CoC7.IdeaCheck",
        know: "CoC7.KnowCheck"
      };
      const key = configLabels[field];
      return key ? game.i18n.localize(key) : null;
    }

    try {
      const schema = CONFIG.Actor.dataModels.character.defineSchema();
      const fieldDefinition = schema[group]?.getField(field);
      const labelKey = fieldDefinition?.hint ?? fieldDefinition?.label;
      return labelKey ? game.i18n.localize(labelKey) : null;
    } catch (error) {
      console.error("ginzzzu-coc7-player-hud | Failed to resolve Active Effect field label", error);
      return null;
    }
  }

  static #isCoc7Condition(effect) {
    const effectStatuses = new Set(effect.statuses ?? []);
    return COC7_CONDITION_IDS.some((conditionId) => effectStatuses.has(conditionId));
  }

  static #isStatus(effect) {
    const effectStatuses = new Set(effect.statuses ?? []);
    if (effectStatuses.size === 0) return false;

    const configured = Array.isArray(CONFIG.statusEffects)
      ? CONFIG.statusEffects
      : [];
    return configured.some((status) => effectStatuses.has(status.id));
  }

  static #localizedLabel(primaryKey, fallbackKey) {
    const primary = game.i18n.localize(primaryKey);
    return primary === primaryKey ? game.i18n.localize(fallbackKey) : primary;
  }

  static #empty() {
    return {
      consequenceCategories: [],
      consequenceCount: 0,
      hasConsequences: false
    };
  }
}
