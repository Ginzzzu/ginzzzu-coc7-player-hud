import { CharacteristicsService } from "../services/characteristics-service.js";
import { Coc7CombinedRollService } from "../services/coc7-combined-roll-service.js";
import { Coc7RollService } from "../services/coc7-roll-service.js";
import { PreferencesService } from "../services/preferences-service.js";
import { ActionRequestResolver } from "./action-request-resolver.js";

const DIFFICULTIES = new Set(["regular", "hard", "extreme"]);
const OPERATORS = new Set(["all", "any"]);

function normalizePoolModifier(value) {
  return Math.max(-2, Math.min(2, Number(value) || 0));
}

function normalizeOptions(parameters = {}) {
  const difficulty = DIFFICULTIES.has(parameters.difficulty) ? parameters.difficulty : "regular";
  const modifier = normalizePoolModifier(parameters.modifier);
  return {difficulty, poolModifier: modifier};
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class ActionRequestService {
  static build(actor, options = {}) {
    return ActionRequestResolver.build(actor, options);
  }

  static resolve(actor, actionId) {
    return ActionRequestResolver.resolve(actor, actionId);
  }

  static describeCheck(actor, actionId, {skillId = null} = {}) {
    const action = ActionRequestResolver.resolve(actor, actionId);
    if (!action?.available) return null;

    if (action.resolved?.type === "characteristic") {
      return this.describeCharacteristic(actor, action.resolved.key);
    }

    if (action.resolved?.type === "attribute") {
      const key = action.resolved.key;
      const value = number(actor.system?.attribs?.[key]?.value);
      if (!value || !["lck", "san"].includes(key)) return null;
      return {
        identity: `attribute:${key}`,
        key,
        label: action.detail,
        poolModifier: 0,
        type: "attribute",
        value
      };
    }

    const itemId = skillId || action.resolved?.itemId;
    return this.describeSkill(actor, itemId);
  }

  static describeCharacteristic(actor, key) {
    if (!actor || !CharacteristicsService.has(key)) return null;
    const characteristic = CharacteristicsService.build(actor).find((entry) => entry.key === key);
    if (!characteristic?.value) return null;
    return {
      identity: `characteristic:${key}`,
      key,
      label: characteristic.label,
      poolModifier: 0,
      type: "characteristic",
      value: characteristic.value
    };
  }

  static describeSkill(actor, itemId) {
    const skill = actor?.items?.get(itemId);
    if (!skill || skill.type !== "skill") return null;
    return {
      identity: `skill:${skill.id}`,
      itemId: skill.id,
      label: skill.name,
      poolModifier: 0,
      type: "skill",
      uuid: skill.uuid,
      value: number(skill.system?.value)
    };
  }

  static normalizeChecks(actor, checks = []) {
    const normalized = [];
    const identities = new Set();

    for (const check of Array.isArray(checks) ? checks : []) {
      let resolved = null;
      if (check?.type === "skill") resolved = this.describeSkill(actor, check.itemId);
      else if (check?.type === "characteristic") resolved = this.describeCharacteristic(actor, check.key);
      else if (check?.type === "attribute") {
        const key = String(check.key ?? "");
        const value = number(actor?.system?.attribs?.[key]?.value);
        if (["lck", "san"].includes(key) && value > 0) {
          resolved = {
            identity: `attribute:${key}`,
            key,
            label: key === "lck" ? game.i18n.localize("CoC7.Luck") : game.i18n.localize("CoC7.Sanity"),
            poolModifier: 0,
            type: "attribute",
            value
          };
        }
      }
      if (!resolved || identities.has(resolved.identity)) continue;
      identities.add(resolved.identity);
      normalized.push({...resolved, poolModifier: normalizePoolModifier(check?.poolModifier)});
    }

    return normalized;
  }

  static serializeChecks(checks = []) {
    return checks.map((check) => check.type === "skill"
      ? {type: "skill", itemId: check.itemId, poolModifier: normalizePoolModifier(check.poolModifier)}
      : {type: check.type, key: check.key, poolModifier: normalizePoolModifier(check.poolModifier)});
  }

  static async execute(actor, actionId, {skillId = null, parameters = {}, fastForward = false} = {}) {
    const action = ActionRequestResolver.resolve(actor, actionId);
    if (!action?.available) throw new Error(`Action request is unavailable: ${actionId}`);
    const rollOptions = normalizeOptions(parameters);
    const shouldFastForward = Boolean(fastForward || parameters.locked);

    if (action.resolved?.type === "characteristic") {
      return Coc7RollService.characteristic(actor, action.resolved.key, {fastForward: shouldFastForward, ...rollOptions});
    }

    if (action.resolved?.type === "attribute") {
      return Coc7RollService.attribute(actor, action.resolved.key, {fastForward: shouldFastForward, ...rollOptions});
    }

    const itemId = skillId || action.resolved?.itemId;
    if (!itemId) throw new Error(`A specialization must be selected for: ${actionId}`);
    const skill = actor.items?.get(itemId);
    if (!skill || skill.type !== "skill") throw new Error(`Skill not found: ${itemId}`);
    const result = await Coc7RollService.skill(actor, itemId, {fastForward: shouldFastForward, ...rollOptions});
    if (skill.uuid) await PreferencesService.rememberRecentSkill(skill.uuid);
    return result;
  }

  static async executeCombined(actor, checks, {operator = "all", parameters = {}} = {}) {
    const sourceChecks = Array.isArray(checks) ? checks : [];
    const hasPerCheckModifiers = sourceChecks.some((check) => Object.hasOwn(check ?? {}, "poolModifier"));
    const normalized = this.normalizeChecks(actor, sourceChecks);
    if (normalized.length < 2) throw new Error("A combined roll requires at least two available checks");
    const rollOptions = normalizeOptions(parameters);
    if (!hasPerCheckModifiers && rollOptions.poolModifier !== 0) {
      for (const check of normalized) check.poolModifier = rollOptions.poolModifier;
    }
    const result = await Coc7CombinedRollService.roll(actor, normalized, {
      difficulty: rollOptions.difficulty,
      operator: OPERATORS.has(operator) ? operator : "all"
    });
    await PreferencesService.rememberRecentSkills(
      normalized.filter((check) => check.type === "skill" && check.uuid).map((check) => check.uuid)
    );
    return result;
  }
}
