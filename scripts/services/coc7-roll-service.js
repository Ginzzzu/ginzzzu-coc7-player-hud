import { CharacteristicsService } from "./characteristics-service.js";
import { WeaponAttackService } from "./weapon-attack-service.js";

const ATTRIBUTES = new Set(["lck", "san"]);

export class Coc7RollService {
  static async characteristic(actor, key, {fastForward = false, difficulty, poolModifier} = {}) {
    this.#assertActor(actor);
    if (!CharacteristicsService.has(key)) throw new Error(`Unsupported characteristic: ${key}`);
    if (typeof actor.characteristicCheck !== "function") {
      throw new Error("CoC7 characteristicCheck API is unavailable");
    }

    return actor.characteristicCheck(key, fastForward, {difficulty, poolModifier});
  }

  static async attribute(actor, key, {fastForward = false, difficulty, poolModifier} = {}) {
    this.#assertActor(actor);
    if (!ATTRIBUTES.has(key)) throw new Error(`Unsupported attribute: ${key}`);
    if (typeof actor.attributeCheck !== "function") {
      throw new Error("CoC7 attributeCheck API is unavailable");
    }

    return actor.attributeCheck(key, fastForward, {difficulty, poolModifier});
  }

  static async deathCheck(actor) {
    this.#assertActor(actor);
    const sheet = actor.sheet;
    if (typeof sheet?.checkForDeath !== "function") {
      throw new Error("CoC7 death-check API is unavailable");
    }

    return sheet.checkForDeath();
  }

  static async skill(actor, itemId, {fastForward = false, difficulty, poolModifier} = {}) {
    this.#assertActor(actor);
    const skill = actor.items?.get(itemId);
    if (!skill || skill.type !== "skill") throw new Error(`Skill not found: ${itemId}`);
    if (typeof actor.skillCheck !== "function") {
      throw new Error("CoC7 skillCheck API is unavailable");
    }

    return actor.skillCheck({name: skill.name, uuid: skill.uuid}, fastForward, {difficulty, poolModifier});
  }

  static async weapon(actor, itemId, {fastForward = false} = {}) {
    this.#assertActor(actor);
    const weapon = actor.items?.get(itemId);
    if (!weapon || weapon.type !== "weapon") throw new Error(`Weapon not found: ${itemId}`);
    if (typeof actor.weaponCheck !== "function") {
      throw new Error("CoC7 weaponCheck API is unavailable");
    }

    await WeaponAttackService.prepare(weapon);
    return actor.weaponCheck({uuid: weapon.uuid}, fastForward);
  }

  static #assertActor(actor) {
    if (!actor || !actor.isOwner) throw new Error("An owned investigator is required");
  }
}
