import { AgeAdjustmentService } from "./age-adjustment-service.js";
import { SkillAllocationService } from "./skill-allocation-service.js";

const CREDIT_COCID = "i.skill.credit-rating";
const MYTHOS_COCID = "i.skill.cthulhu-mythos";
const OWN_LANGUAGE_COCID = "i.skill.language-own-ru";

function integer(value, fallback = 0) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function normalizedText(value) {
  return String(value ?? "").trim();
}

export class PersonalInterestService {
  static reconcile({draft, skillOptions = [], skills = null}) {
    const source = draft?.toObject?.() ?? draft ?? {};
    const current = foundry.utils.deepClone(
      Array.isArray(skills) ? skills : (source.skills ?? [])
    );
    const optionsByCocid = new Map(
      skillOptions.filter((skill) => skill.cocid).map((skill) => [skill.cocid, skill])
    );
    const occupationRows = current.filter((skill) => skill.isOccupation);
    const result = occupationRows.map((skill) => this.#normalizeExistingSkill({
      draft: source,
      option: optionsByCocid.get(skill.sourceCocid ?? skill.cocid),
      skill
    }));

    for (const skill of current.filter((entry) => !entry.isOccupation)) {
      const cocid = skill.sourceCocid ?? skill.cocid;
      const option = optionsByCocid.get(cocid);
      const occupationMatch = result.find((entry) => (
        entry.isOccupation
        && (entry.sourceCocid ?? entry.cocid) === cocid
        && !entry.requiresName
      ));
      if (occupationMatch) {
        occupationMatch.personal = Math.max(
          integer(occupationMatch.personal),
          integer(skill.personal)
        );
        continue;
      }
      if (!option && integer(skill.personal) === 0) continue;
      result.push(this.#normalizeExistingSkill({draft: source, option, skill}));
    }

    for (const option of skillOptions) {
      if (!option.cocid) continue;
      const represented = result.some((skill) => (
        (skill.sourceCocid ?? skill.cocid) === option.cocid
      ));
      if (represented) continue;
      result.push(this.#createSetupSkill({draft: source, option}));
    }

    return {skills: this.#deduplicateSlots(result)};
  }

  static pointState(draft) {
    const source = draft?.toObject?.() ?? draft ?? {};
    const intelligence = AgeAdjustmentService.finalValue(source.characteristics?.int ?? {}) ?? 0;
    return {
      characteristic: integer(intelligence),
      total: integer(intelligence) * 2
    };
  }

  static validate({draft, skills}) {
    const source = draft?.toObject?.() ?? draft ?? {};
    const pointState = this.pointState(source);
    const rows = Array.isArray(skills) ? skills : [];
    const spent = rows.reduce((sum, skill) => sum + integer(skill.personal), 0);
    const remaining = pointState.total - spent;
    const skillValidation = rows.map((skill) => {
      const sourceCocid = skill.sourceCocid ?? skill.cocid;
      const specializationRequired = skill.isOccupation
        || integer(skill.personal) > 0
        || sourceCocid === OWN_LANGUAGE_COCID;
      return {
        slotId: skill.slotId,
        specializationValid: !skill.requiresName
          || !specializationRequired
          || Boolean(normalizedText(skill.specialization)),
        ...SkillAllocationService.validateCreation(skill)
      };
    });
    const credit = rows.find((skill) => skill.cocid === CREDIT_COCID);
    const creditValue = credit ? SkillAllocationService.creationTotal(credit) : 0;
    const creditMin = source.occupation?.creditMin ?? 0;
    const creditMax = source.occupation?.creditMax ?? null;
    const creditValid = Boolean(credit)
      && creditValue >= creditMin
      && (creditMax === null || creditValue <= creditMax);
    const uniqueSlots = new Set(rows.map((skill) => skill.slotId));
    const valid = remaining === 0
      && creditValid
      && uniqueSlots.size === rows.length
      && skillValidation.every((entry) => (
        entry.valid && entry.mythosValid && entry.specializationValid
      ));

    return {
      creditValid,
      creditValue,
      pointState,
      remaining,
      skillValidation,
      spent,
      valid
    };
  }

  static setPersonalPoints({draft, slotId, value}) {
    const source = draft.toObject();
    const skills = foundry.utils.deepClone(source.skills ?? []);
    const skill = skills.find((entry) => entry.slotId === slotId);
    if (!skill || skill.cocid === MYTHOS_COCID) return null;

    const validation = this.validate({draft: source, skills});
    const requested = integer(value);
    const current = integer(skill.personal);
    const available = Math.max(0, validation.remaining + current);
    let next = Math.min(requested, available);

    if (skill.cocid === CREDIT_COCID && source.occupation?.creditMax !== null) {
      const maximum = Math.max(
        0,
        integer(source.occupation.creditMax)
          - integer(skill.base)
          - integer(skill.occupation)
      );
      next = Math.min(next, maximum);
    }

    skill.personal = next;
    return {skills};
  }

  static setSpecialization({draft, skillOptions, slotId, value}) {
    const source = draft.toObject();
    const skills = foundry.utils.deepClone(source.skills ?? []);
    const skill = skills.find((entry) => entry.slotId === slotId);
    if (!skill?.requiresName || skill.isOccupation) return null;

    const specialization = normalizedText(value) || null;
    const option = skillOptions.find((entry) => (
      entry.cocid === (skill.sourceCocid ?? skill.cocid)
    ));
    skill.specialization = specialization;
    skill.name = this.#displayName(option ?? skill, specialization);
    return {skills};
  }

  static personalMaximum({draft, skill}) {
    const source = draft?.toObject?.() ?? draft ?? {};
    const capacity = Math.max(integer(skill.personal), this.pointState(source).total);
    if (skill.cocid !== CREDIT_COCID || source.occupation?.creditMax === null) {
      return capacity;
    }
    return Math.min(
      capacity,
      Math.max(
        0,
        integer(source.occupation.creditMax)
          - integer(skill.base)
          - integer(skill.occupation)
      )
    );
  }

  static #createSetupSkill({draft, option}) {
    return {
      base: SkillAllocationService.baseValue(option.baseFormula, draft.characteristics),
      cocid: option.cocid,
      developmentMarked: false,
      documentId: option.documentId,
      experience: 0,
      isOccupation: false,
      name: option.name,
      occupation: 0,
      personal: 0,
      requiresName: option.requiresName,
      slotId: `setup:${option.cocid}`,
      sourceCocid: option.cocid,
      specialization: null,
      uuid: option.uuid
    };
  }

  static #normalizeExistingSkill({draft, option, skill}) {
    const normalized = {
      ...foundry.utils.deepClone(skill),
      developmentMarked: false,
      experience: 0,
      personal: integer(skill.personal),
      occupation: skill.isOccupation ? integer(skill.occupation) : 0,
      requiresName: Boolean(skill.requiresName ?? option?.requiresName),
      sourceCocid: skill.sourceCocid ?? skill.cocid ?? option?.cocid ?? null
    };
    if (option) {
      normalized.base = SkillAllocationService.baseValue(
        option.baseFormula,
        draft.characteristics
      );
      normalized.cocid = option.cocid;
      normalized.documentId = option.documentId;
      normalized.uuid = option.uuid;
      if (!normalized.requiresName) normalized.name = option.name;
    }
    return normalized;
  }

  static #deduplicateSlots(skills) {
    const used = new Set();
    return skills.map((skill, index) => {
      let slotId = skill.slotId || `personal:${index}:${skill.cocid ?? "skill"}`;
      while (used.has(slotId)) slotId = `${slotId}:${index}`;
      used.add(slotId);
      return {...skill, slotId};
    });
  }

  static #displayName(skill, specialization) {
    if (!skill.requiresName || !specialization) return skill.name;
    return skill.specializationGroup
      ? `${skill.specializationGroup} (${specialization})`
      : specialization;
  }
}
