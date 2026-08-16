import { AgeAdjustmentService } from "./age-adjustment-service.js";

const CTHULHU_MYTHOS_COCID = "i.skill.cthulhu-mythos";

export class SkillAllocationService {
  static baseValue(formula, characteristics = {}) {
    const text = String(formula ?? "0").trim();
    if (/^\d+$/.test(text)) return this.#number(text);

    const match = text.match(/^(?:(1)\/(2|5)\*)?@([A-Z]+)$/i);
    if (!match) return 0;

    const characteristic = characteristics[String(match[3]).toLowerCase()] ?? {};
    const value = AgeAdjustmentService.finalValue(characteristic) ?? 0;
    if (!match[2]) return this.#number(value);
    return Math.max(0, Math.floor(value / this.#number(match[2], 1)));
  }

  static total(skill = {}) {
    return [skill.base, skill.personal, skill.occupation, skill.experience]
      .reduce((total, value) => total + this.#number(value), 0);
  }

  static creationTotal(skill = {}) {
    return [skill.base, skill.personal, skill.occupation]
      .reduce((total, value) => total + this.#number(value), 0);
  }

  static validateCreation(skill = {}) {
    const base = this.#number(skill.base);
    const occupation = this.#number(skill.occupation);
    const personal = this.#number(skill.personal);
    const total = base + occupation + personal;
    const experienceValid = this.#number(skill.experience) === 0;
    const mythosValid = skill.cocid !== CTHULHU_MYTHOS_COCID || (
      personal === 0 && occupation === 0
    );
    return {
      experienceValid,
      mythosValid,
      total,
      valid: experienceValid && mythosValid
    };
  }

  static #number(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : fallback;
  }
}
