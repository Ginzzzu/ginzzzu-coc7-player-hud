const CONDITION_DEFINITIONS = Object.freeze([
  Object.freeze({
    fallbackImg: "systems/CoC7/assets/icons/falling.svg",
    group: "physical",
    id: "prone",
    label: "CoC7.Prone"
  }),
  Object.freeze({
    fallbackImg: "systems/CoC7/assets/icons/knocked-out-stars.svg",
    group: "physical",
    id: "unconscious",
    label: "CoC7.Unconscious"
  }),
  Object.freeze({
    fallbackImg: "systems/CoC7/assets/icons/arm-sling.svg",
    group: "physical",
    id: "criticalWounds",
    label: "CoC7.CriticalWounds"
  }),
  Object.freeze({
    fallbackImg: "systems/CoC7/assets/icons/heart-beats.svg",
    group: "physical",
    id: "dying",
    label: "CoC7.Dying"
  }),
  Object.freeze({
    fallbackImg: "systems/CoC7/assets/icons/tombstone.svg",
    group: "physical",
    id: "dead",
    label: "CoC7.Dead"
  }),
  Object.freeze({
    fallbackImg: "systems/CoC7/assets/icons/hanging-spider.svg",
    group: "mental",
    id: "tempoInsane",
    label: "CoC7.BoutOfMadnessName"
  }),
  Object.freeze({
    fallbackImg: "systems/CoC7/assets/icons/tentacles-skull.svg",
    group: "mental",
    id: "indefInsane",
    label: "CoC7.IndefiniteInsanity"
  })
]);

const GROUP_DEFINITIONS = Object.freeze([
  Object.freeze({
    icon: "fa-solid fa-heart-pulse",
    id: "physical",
    label: "GINZZZU_C7PH.Sections.Consequences.ConditionGroups.Physical"
  }),
  Object.freeze({
    icon: "fa-solid fa-brain",
    id: "mental",
    label: "GINZZZU_C7PH.Sections.Consequences.ConditionGroups.Mental"
  })
]);

export const COC7_CONDITION_IDS = Object.freeze(
  CONDITION_DEFINITIONS.map((definition) => definition.id)
);

export class ConditionsService {
  static build(actor) {
    if (!actor) return this.#empty();

    const canManageConditions = this.canManage(actor);
    const configuredEffects = this.#configuredEffects();
    const conditions = CONDITION_DEFINITIONS.map((definition) => {
      const active = Boolean(actor.system?.conditions?.[definition.id]?.value);
      const duration = definition.id === "tempoInsane"
        ? String(actor.getTempoInsaneDurationText ?? "").trim()
        : "";
      const label = game.i18n.localize(definition.label);
      const configured = configuredEffects.get(definition.id);
      const tooltip = duration ? `${label}: ${duration}` : label;

      return {
        active,
        canToggle: canManageConditions,
        duration,
        group: definition.group,
        id: definition.id,
        img: configured?.img ?? definition.fallbackImg,
        label,
        stateLabel: game.i18n.localize(
          active
            ? "GINZZZU_C7PH.Sections.Consequences.ConditionActive"
            : "GINZZZU_C7PH.Sections.Consequences.ConditionInactive"
        ),
        tooltip
      };
    });

    const activeConditions = conditions.filter((condition) => condition.active);
    const activeLabels = activeConditions.map((condition) => condition.tooltip);

    return {
      activeConditionCompactIndicators: activeConditions.slice(0, 2),
      activeConditionCompactOverflow: Math.max(0, activeConditions.length - 2),
      activeConditionCount: activeConditions.length,
      activeConditionIndicators: activeConditions.slice(0, 3),
      activeConditionOverflow: Math.max(0, activeConditions.length - 3),
      activeConditionTooltip: activeLabels.join("\n"),
      canManageConditions,
      conditionGroups: GROUP_DEFINITIONS.map((group) => ({
        conditions: conditions.filter((condition) => condition.group === group.id),
        icon: group.icon,
        id: group.id,
        label: game.i18n.localize(group.label)
      })),
      conditionsHint: game.i18n.localize(
        canManageConditions
          ? "GINZZZU_C7PH.Sections.Consequences.ConditionEditableHint"
          : "GINZZZU_C7PH.Sections.Consequences.ConditionReadOnlyHint"
      ),
      hasActiveConditions: activeConditions.length > 0,
      showDeathCheck: Boolean(
        actor.isOwner
        && conditions.find((condition) => condition.id === "dying")?.active
      )
    };
  }

  static canManage(actor) {
    if (!actor?.isOwner) return false;
    if (game.user?.isGM) return true;

    try {
      return Boolean(game.settings.get("CoC7", "statusPlayerEditable"));
    } catch (error) {
      console.error("ginzzzu-coc7-player-hud | Failed to read CoC7 statusPlayerEditable", error);
      return false;
    }
  }

  static async toggle(actor, conditionId) {
    if (!actor?.isOwner) throw new Error("An owned investigator is required");
    if (!COC7_CONDITION_IDS.includes(conditionId)) {
      throw new Error(`Unsupported CoC7 condition: ${conditionId}`);
    }
    if (!this.canManage(actor)) throw new Error("Condition editing is not permitted");
    if (typeof actor.toggleCondition !== "function") {
      throw new Error("CoC7 toggleCondition API is unavailable");
    }

    return actor.toggleCondition(conditionId);
  }

  static #configuredEffects() {
    const configured = Array.isArray(CONFIG.statusEffects) ? CONFIG.statusEffects : [];
    return new Map(configured.map((effect) => [effect.id, effect]));
  }

  static #empty() {
    return {
      activeConditionCompactIndicators: [],
      activeConditionCompactOverflow: 0,
      activeConditionCount: 0,
      activeConditionIndicators: [],
      activeConditionOverflow: 0,
      activeConditionTooltip: "",
      canManageConditions: false,
      conditionGroups: [],
      conditionsHint: "",
      hasActiveConditions: false,
      showDeathCheck: false
    };
  }
}
