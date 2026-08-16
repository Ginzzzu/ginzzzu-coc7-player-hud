import { AgeAdjustmentService } from "./age-adjustment-service.js";
import { SkillAllocationService } from "./skill-allocation-service.js";

const CREDIT_COCID = "i.skill.credit-rating";
const MYTHOS_COCID = "i.skill.cthulhu-mythos";

function integer(value, fallback = 0) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

function normalizedText(value) {
  return String(value ?? "").trim();
}

export class OccupationSkillService {
  static createInitialState({definition, draft}) {
    const process = {
      groupSelections: definition.groups.map((group) => ({
        cocids: group.skills.length <= group.options
          ? group.skills.map((skill) => skill.cocid).filter(Boolean)
          : [],
        groupIndex: group.index
      })),
      occupationUuid: definition.uuid,
      personalSelections: Array.from(
        {length: definition.personalChoiceCount},
        (_entry, slotIndex) => ({cocid: null, slotIndex})
      ),
      pointCharacteristic: this.#defaultPointCharacteristic(definition)
    };

    const source = draft?.toObject?.() ?? draft ?? {};
    const previousSkills = (source.skills ?? []).map((skill) => ({
      ...foundry.utils.deepClone(skill),
      isOccupation: false,
      occupation: 0
    }));
    return this.reconcile({definition, draft: source, process, previousSkills});
  }

  static reconcile({definition, draft, process = null, previousSkills = null}) {
    const source = draft?.toObject?.() ?? draft ?? {};
    const nextProcess = foundry.utils.deepClone(
      process
      ?? source.occupationProcess
      ?? {}
    );
    if (nextProcess.occupationUuid !== definition.uuid) {
      return this.createInitialState({definition, draft: source});
    }

    nextProcess.pointCharacteristic = this.#normalizePointCharacteristic(
      definition,
      nextProcess.pointCharacteristic
    );
    nextProcess.groupSelections = this.#normalizeGroupSelections(
      definition,
      nextProcess.groupSelections
    );
    nextProcess.personalSelections = this.#normalizePersonalSelections(
      definition,
      nextProcess.personalSelections,
      nextProcess.groupSelections
    );

    const prior = Array.isArray(previousSkills)
      ? previousSkills
      : (Array.isArray(source.skills) ? source.skills : []);
    const consumed = new Set();
    const selected = this.#selectedSkillSlots(definition, nextProcess);
    const occupationSkills = selected.map((slot) => {
      const previous = this.#takePreviousSkill({consumed, prior, slot});
      return this.#allocationForSlot({definition, draft: source, previous, slot});
    });
    const retainedPersonalSkills = prior
      .filter((skill, index) => (
        !consumed.has(index)
        && (
          integer(skill.personal) > 0
          || !skill.isOccupation
          || String(skill.slotId ?? "").startsWith("setup:")
        )
      ))
      .map((skill) => ({
        ...foundry.utils.deepClone(skill),
        isOccupation: false,
        occupation: 0
      }));

    return {
      occupationProcess: nextProcess,
      skills: occupationSkills.concat(retainedPersonalSkills)
    };
  }

  static pointState({definition, draft, process}) {
    const source = draft?.toObject?.() ?? draft ?? {};
    const fixedTerms = definition.pointTerms.filter((term) => !term.optional);
    const optionalTerms = definition.pointTerms.filter((term) => term.optional);
    const selectedKey = this.#normalizePointCharacteristic(
      definition,
      process?.pointCharacteristic
    );
    const selectedOptional = optionalTerms.find((term) => term.key === selectedKey) ?? null;
    const appliedTerms = selectedOptional
      ? fixedTerms.concat(selectedOptional)
      : fixedTerms;
    const rows = appliedTerms.map((term) => {
      const characteristic = source.characteristics?.[term.key] ?? {};
      const value = AgeAdjustmentService.finalValue(characteristic) ?? 0;
      return {...term, total: term.multiplier * value, value};
    });

    return {
      complete: optionalTerms.length === 0 || Boolean(selectedOptional),
      fixedTerms,
      formula: rows.map((term) => `${term.label} × ${term.multiplier}`).join(" + "),
      optionalTerms,
      selectedKey,
      total: rows.reduce((sum, term) => sum + term.total, 0)
    };
  }

  static validate({definition, draft, process, skills}) {
    const occupationSkills = (skills ?? []).filter((skill) => skill.isOccupation);
    const pointState = this.pointState({definition, draft, process});
    const groupStates = definition.groups.map((group) => {
      const selection = process.groupSelections.find((entry) => (
        entry.groupIndex === group.index
      ));
      const selected = selection?.cocids ?? [];
      return {
        complete: selected.length === Math.min(group.options, group.skills.length),
        index: group.index,
        required: Math.min(group.options, group.skills.length),
        selected: selected.length
      };
    });
    const personalComplete = process.personalSelections.length === definition.personalChoiceCount
      && process.personalSelections.every((entry) => Boolean(entry.cocid));
    const specializationsComplete = occupationSkills.every((skill) => (
      !skill.requiresName || Boolean(normalizedText(skill.specialization))
    ));
    const skillValidation = occupationSkills.map((skill) => ({
      slotId: skill.slotId,
      ...SkillAllocationService.validateCreation(skill),
      mythosValid: skill.cocid !== MYTHOS_COCID || (
        integer(skill.occupation) === 0 && integer(skill.personal) === 0
      )
    }));
    const credit = occupationSkills.find((skill) => skill.cocid === CREDIT_COCID);
    const creditValue = credit ? SkillAllocationService.creationTotal(credit) : 0;
    const creditValid = Boolean(credit)
      && creditValue >= (definition.creditMin ?? 0)
      && (definition.creditMax === null || creditValue <= definition.creditMax);
    const spent = occupationSkills.reduce((sum, skill) => sum + integer(skill.occupation), 0);
    const remaining = pointState.total - spent;
    const uniqueSlots = new Set(occupationSkills.map((skill) => skill.slotId));
    const choicesComplete = groupStates.every((group) => group.complete) && personalComplete;
    const valid = pointState.complete
      && choicesComplete
      && specializationsComplete
      && creditValid
      && remaining === 0
      && uniqueSlots.size === occupationSkills.length
      && skillValidation.every((entry) => entry.valid && entry.mythosValid);

    return {
      choicesComplete,
      creditValid,
      creditValue,
      groupStates,
      personalComplete,
      pointState,
      remaining,
      skillValidation,
      specializationsComplete,
      spent,
      valid
    };
  }

  static setPointCharacteristic({definition, draft, key}) {
    const source = draft.toObject();
    const process = foundry.utils.deepClone(source.occupationProcess);
    process.pointCharacteristic = key;
    return this.reconcile({definition, draft: source, process});
  }

  static toggleGroupSkill({cocid, definition, draft, groupIndex}) {
    const source = draft.toObject();
    const process = foundry.utils.deepClone(source.occupationProcess);
    const group = definition.groups.find((entry) => entry.index === groupIndex);
    const selection = process.groupSelections.find((entry) => entry.groupIndex === groupIndex);
    if (!group || !selection || !group.skills.some((skill) => skill.cocid === cocid)) return null;

    const selected = new Set(selection.cocids);
    if (selected.has(cocid)) selected.delete(cocid);
    else if (selected.size < Math.min(group.options, group.skills.length)) selected.add(cocid);
    selection.cocids = [...selected];
    return this.reconcile({definition, draft: source, process});
  }

  static setPersonalSkill({cocid, definition, draft, slotIndex}) {
    const source = draft.toObject();
    const process = foundry.utils.deepClone(source.occupationProcess);
    const selection = process.personalSelections.find((entry) => entry.slotIndex === slotIndex);
    if (!selection) return null;
    selection.cocid = cocid || null;
    return this.reconcile({definition, draft: source, process});
  }

  static setSpecialization({definition, draft, slotId, value}) {
    const source = draft.toObject();
    const skills = foundry.utils.deepClone(source.skills ?? []);
    const skill = skills.find((entry) => entry.slotId === slotId);
    if (!skill?.requiresName) return null;
    skill.specialization = normalizedText(value) || null;
    skill.name = this.#displayName(skill, skill.specialization);
    return this.reconcile({definition, draft: source, previousSkills: skills});
  }

  static setOccupationPoints({definition, draft, slotId, value}) {
    const source = draft.toObject();
    const skills = foundry.utils.deepClone(source.skills ?? []);
    const skill = skills.find((entry) => entry.slotId === slotId);
    if (!skill || skill.cocid === MYTHOS_COCID) return null;

    const validation = this.validate({
      definition,
      draft: source,
      process: source.occupationProcess,
      skills
    });
    const requested = Math.max(0, integer(value));
    const current = integer(skill.occupation);
    const available = Math.max(0, validation.remaining + current);
    let next = Math.min(requested, available);

    if (skill.cocid === CREDIT_COCID) {
      const assignedWithoutOccupation = integer(skill.base) + integer(skill.personal);
      const minimum = Math.max(0, (definition.creditMin ?? 0) - assignedWithoutOccupation);
      const maximum = definition.creditMax === null
        ? available
        : Math.max(0, definition.creditMax - assignedWithoutOccupation);
      next = Math.max(minimum, Math.min(next, maximum));
    }

    skill.occupation = next;
    return this.reconcile({definition, draft: source, previousSkills: skills});
  }

  static skillOptions({definition, process, slotIndex}) {
    const selectedElsewhere = new Set(
      process.personalSelections
        .filter((entry) => entry.slotIndex !== slotIndex)
        .map((entry) => entry.cocid)
        .filter(Boolean)
    );
    const fixedCocids = new Set([
      ...definition.requiredSkills.map((skill) => skill.cocid),
      ...process.groupSelections.flatMap((entry) => entry.cocids)
    ].filter(Boolean));

    return definition.skillOptions.filter((skill) => (
      skill.cocid !== MYTHOS_COCID
      && skill.cocid !== CREDIT_COCID
      && !selectedElsewhere.has(skill.cocid)
      && !fixedCocids.has(skill.cocid)
    ));
  }

  static #allocationForSlot({definition, draft, previous, slot}) {
    const skill = slot.skill;
    const base = SkillAllocationService.baseValue(skill.baseFormula, draft.characteristics);
    const sameSource = previous?.sourceCocid === skill.cocid || previous?.cocid === skill.cocid;
    const specialization = sameSource
      ? normalizedText(previous.specialization) || null
      : null;
    const isCredit = skill.cocid === CREDIT_COCID;
    const priorOccupation = previous?.isOccupation ? integer(previous.occupation) : 0;
    const occupation = isCredit && priorOccupation === 0
      ? Math.max(0, (definition.creditMin ?? 0) - base - integer(previous?.personal))
      : Math.max(0, priorOccupation);

    return {
      base,
      cocid: skill.cocid,
      developmentMarked: false,
      documentId: skill.documentId,
      experience: 0,
      isOccupation: true,
      name: this.#displayName(skill, specialization),
      occupation,
      personal: Math.max(0, integer(previous?.personal)),
      requiresName: skill.requiresName,
      slotId: slot.slotId,
      sourceCocid: skill.cocid,
      specialization,
      uuid: skill.uuid
    };
  }

  static #takePreviousSkill({consumed, prior, slot}) {
    const exactIndex = prior.findIndex((skill, index) => (
      !consumed.has(index) && skill.slotId === slot.slotId
    ));
    if (exactIndex >= 0) {
      consumed.add(exactIndex);
      return prior[exactIndex];
    }

    const fallbackIndex = prior.findIndex((skill, index) => (
      !consumed.has(index)
      && (skill.sourceCocid ?? skill.cocid) === slot.skill.cocid
    ));
    if (fallbackIndex < 0) return null;
    consumed.add(fallbackIndex);
    return prior[fallbackIndex];
  }

  static #selectedSkillSlots(definition, process) {
    const byCocid = new Map(definition.skillOptions.map((skill) => [skill.cocid, skill]));
    for (const skill of definition.requiredSkills) if (skill.cocid) byCocid.set(skill.cocid, skill);
    for (const group of definition.groups) {
      for (const skill of group.skills) if (skill.cocid) byCocid.set(skill.cocid, skill);
    }

    const slots = definition.requiredSkills.map((skill, index) => ({
      skill,
      slotId: `required:${index}:${skill.cocid ?? skill.documentId ?? index}`
    }));
    const credit = byCocid.get(CREDIT_COCID)
      ?? definition.skillOptions.find((skill) => skill.cocid === CREDIT_COCID);
    if (credit && !slots.some((slot) => slot.skill.cocid === CREDIT_COCID)) {
      slots.push({skill: credit, slotId: "credit-rating"});
    }

    for (const group of definition.groups) {
      const selection = process.groupSelections.find((entry) => entry.groupIndex === group.index);
      for (const cocid of selection?.cocids ?? []) {
        const skill = group.skills.find((entry) => entry.cocid === cocid) ?? byCocid.get(cocid);
        if (skill) slots.push({skill, slotId: `group:${group.index}:${cocid}`});
      }
    }
    for (const selection of process.personalSelections) {
      const skill = byCocid.get(selection.cocid);
      if (skill) slots.push({skill, slotId: `personal:${selection.slotIndex}`});
    }
    return slots;
  }

  static #normalizePointCharacteristic(definition, value) {
    const optional = definition.pointTerms.filter((term) => term.optional);
    if (optional.length === 0) return null;
    if (optional.some((term) => term.key === value)) return value;
    return optional.length === 1 ? optional[0].key : null;
  }

  static #defaultPointCharacteristic(definition) {
    const optional = definition.pointTerms.filter((term) => term.optional);
    return optional.length === 1 ? optional[0].key : null;
  }

  static #normalizeGroupSelections(definition, source) {
    const current = Array.isArray(source) ? source : [];
    return definition.groups.map((group) => {
      const entry = current.find((selection) => selection.groupIndex === group.index);
      const allowed = new Set(group.skills.map((skill) => skill.cocid));
      const required = Math.min(group.options, group.skills.length);
      const cocids = group.skills.length <= group.options
        ? group.skills.map((skill) => skill.cocid).filter(Boolean)
        : [...new Set(entry?.cocids ?? [])]
          .filter((cocid) => allowed.has(cocid))
          .slice(0, required);
      return {cocids, groupIndex: group.index};
    });
  }

  static #normalizePersonalSelections(definition, source, groupSelections) {
    const current = Array.isArray(source) ? source : [];
    const allowed = new Set(definition.skillOptions.map((skill) => skill.cocid).filter(Boolean));
    const unavailable = new Set([
      CREDIT_COCID,
      MYTHOS_COCID,
      ...definition.requiredSkills.map((skill) => skill.cocid),
      ...groupSelections.flatMap((entry) => entry.cocids)
    ].filter(Boolean));

    return Array.from({length: definition.personalChoiceCount}, (_entry, slotIndex) => {
      const cocid = current.find((selection) => selection.slotIndex === slotIndex)?.cocid ?? null;
      const valid = cocid && allowed.has(cocid) && !unavailable.has(cocid);
      if (valid) unavailable.add(cocid);
      return {cocid: valid ? cocid : null, slotIndex};
    });
  }

  static #displayName(skill, specialization) {
    if (!skill.requiresName || !specialization) return skill.name;
    return skill.specializationGroup
      ? `${skill.specializationGroup} (${specialization})`
      : specialization;
  }
}
