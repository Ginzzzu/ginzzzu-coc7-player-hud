import { AmmoService } from "./ammo-service.js";
import { CombatTrackerService } from "./combat-tracker-service.js";
import { WeaponDamageService } from "./weapon-damage-service.js";

export class CombatService {
  static build(actor) {
    if (!actor) return this.#empty();

    const combatEncounter = CombatTrackerService.build(actor);
    const weapons = [...actor.items]
      .filter((item) => item.type === "weapon")
      .map((item) => this.#weapon(actor, item))
      .sort((left, right) => {
        if (left.isRanged !== right.isRanged) return left.isRanged ? 1 : -1;
        return left.name.localeCompare(right.name, game.i18n.lang);
      });

    const skills = [...actor.items]
      .filter((item) => item.type === "skill" && this.#isCombatSkill(item))
      .map((item) => this.#skill(item))
      .sort((left, right) => left.name.localeCompare(right.name, game.i18n.lang));

    return {
      attacksPerRound: this.#attacksPerRound(actor),
      combatEncounter,
      hasCombatLoadout: weapons.length > 0 || skills.length > 0,
      hasCombatOptions: true,
      hasCombatSkills: skills.length > 0,
      hasWeapons: weapons.length > 0,
      combatSkills: skills,
      targetCount: game.user?.targets?.size ?? 0,
      weapons
    };
  }

  static #attacksPerRound(actor) {
    const raw = actor.system?.special?.attacksPerRound;
    const value = raw && typeof raw === "object" ? raw.value : raw;
    const text = String(value ?? "1").trim();
    return text || "1";
  }

  static #empty() {
    return {
      attacksPerRound: "1",
      combatEncounter: CombatTrackerService.build(null),
      hasCombatLoadout: false,
      hasCombatOptions: false,
      hasCombatSkills: false,
      hasWeapons: false,
      combatSkills: [],
      targetCount: 0,
      weapons: []
    };
  }

  static #getWeaponSkill(actor, weapon, key) {
    const getterName = key === "main" ? "skillMain" : "skillAlternative";
    const computed = weapon.system?.[getterName];
    if (computed?.type === "skill") return computed;

    const id = weapon.system?.skill?.[key]?.id;
    const embedded = id ? actor.items?.get(id) : null;
    return embedded?.type === "skill" ? embedded : null;
  }

  static #isCombatSkill(item) {
    const properties = item.system?.properties ?? {};
    return Boolean(
      item.system?.isDodge
      || properties.fighting
      || properties.firearm
      || properties.ranged
    );
  }

  static #number(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  static #skill(item) {
    return {
      id: item.id,
      img: item.img || "icons/svg/d20-black.svg",
      name: item.name,
      occupation: Boolean(item.system?.flags?.occupation),
      uuid: item.uuid,
      value: this.#number(item.system?.value)
    };
  }

  static #weapon(actor, item) {
    const system = item.system ?? {};
    const mainSkill = this.#getWeaponSkill(actor, item, "main");
    const alternativeCandidate = this.#getWeaponSkill(actor, item, "alternativ");
    const alternativeSkill = alternativeCandidate?.id !== mainSkill?.id
      ? alternativeCandidate
      : null;
    const isRanged = Boolean(system.properties?.rngd);
    const damageRanges = Object.entries(system.range ?? {})
      .filter(([, range]) => String(range?.damage ?? "").trim())
      .map(([key, range]) => ({
        key,
        damage: String(range.damage).trim(),
        distance: range.value ?? null
      }));
    const primaryDamageRange = damageRanges.find((range) => range.key === "normal")
      ?? damageRanges[0]
      ?? null;
    const damageFormula = primaryDamageRange
      ? WeaponDamageService.buildFormula(actor, item, primaryDamageRange.key)
      : "";
    const hasAmmoTracker = AmmoService.hasTracker(item);
    const ammo = hasAmmoTracker ? AmmoService.current(item) : null;
    const ammoCapacity = hasAmmoTracker ? AmmoService.capacity(item) : null;
    const outOfAmmo = hasAmmoTracker && !AmmoService.disregardsAmmo && ammo <= 0;
    const damageBonus = system.properties?.addb
      ? game.i18n.localize("CoC7.WeaponAddDb")
      : system.properties?.ahdb
        ? game.i18n.localize("CoC7.WeaponAddHalfDb")
        : "";

    return {
      alternativeSkill: alternativeSkill ? this.#skill(alternativeSkill) : null,
      ammo,
      ammoCapacity,
      attackTitle: game.i18n.localize(
        !mainSkill
          ? "GINZZZU_C7PH.Sections.Combat.NoSkill"
          : outOfAmmo
            ? "GINZZZU_C7PH.Sections.Combat.NoAmmo"
            : "GINZZZU_C7PH.Sections.Combat.WeaponHint"
      ),
      canAttack: Boolean(system.isSkillSet && mainSkill),
      canEditAmmo: Boolean(actor.isOwner && hasAmmoTracker),
      canRollDamage: Boolean(damageFormula),
      category: game.i18n.localize(
        isRanged
          ? "GINZZZU_C7PH.Sections.Combat.Ranged"
          : "GINZZZU_C7PH.Sections.Combat.Melee"
      ),
      damage: primaryDamageRange?.damage ?? "—",
      damageBonus,
      damageFormula,
      damageRange: primaryDamageRange?.key ?? "normal",
      hasAmmoTracker,
      id: item.id,
      img: item.img || "icons/svg/sword.svg",
      isRanged,
      mainSkill: mainSkill ? this.#skill(mainSkill) : null,
      name: item.name,
      outOfAmmo,
      uuid: item.uuid
    };
  }
}
