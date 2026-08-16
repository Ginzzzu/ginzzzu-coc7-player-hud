import { CreationSourceService } from "../services/creation-source-service.js";
import { OccupationSkillService } from "../services/occupation-skill-service.js";
import { SkillAllocationService } from "../services/skill-allocation-service.js";
import {
  compareOccupationSkillRows,
  occupationSkillSourcePresentation,
  skillNameFieldPresentation,
  skillTotalWarning
} from "./skill-row-context.js";
import { allocationPointPresentation } from "./allocation-point-presentation.js";

const CREDIT_COCID = "i.skill.credit-rating";

export async function prepareOccupationSkillsContext(application) {
  const occupationUuid = application._draft?.occupation?.uuid;
  if (!occupationUuid) return emptyContext();

  const definition = await CreationSourceService.getOccupationDefinition(occupationUuid);
  if (!definition) return {...emptyContext(), occupationSkillsLoadFailed: true};

  const source = application._draft.toObject();
  const reconciled = OccupationSkillService.reconcile({definition, draft: source});
  const process = reconciled.occupationProcess;
  const skills = reconciled.skills.filter((skill) => skill.isOccupation);
  const validation = OccupationSkillService.validate({
    definition,
    draft: source,
    process,
    skills
  });
  const pointPresentation = allocationPointPresentation({
    remaining: validation.remaining,
    valid: validation.valid
  });
  const selectedByGroup = new Map(
    process.groupSelections.map((entry) => [entry.groupIndex, new Set(entry.cocids)])
  );
  const groupValidation = new Map(
    validation.groupStates.map((entry) => [entry.index, entry])
  );
  const allocationValidation = new Map(
    validation.skillValidation.map((entry) => [entry.slotId, entry])
  );
  const occupationChoiceGroups = definition.groups.map((group) => {
    const selected = selectedByGroup.get(group.index) ?? new Set();
    const state = groupValidation.get(group.index);
    const required = Math.min(group.options, group.skills.length);
    return {
      complete: state?.complete ?? false,
      index: group.index,
      number: group.index + 1,
      required,
      selected: selected.size,
      skills: group.skills.map((skill) => ({
        ...skill,
        selected: selected.has(skill.cocid)
      }))
    };
  }).filter((group) => group.skills.length > group.required);

  return {
    occupationChoiceGroups,
    occupationCreditMax: definition.creditMax,
    occupationCreditMin: definition.creditMin ?? 0,
    occupationDefinition: definition,
    occupationFormulaChoices: validation.pointState.optionalTerms.map((term) => ({
      ...term,
      selected: term.key === validation.pointState.selectedKey
    })),
    occupationFormulaComplete: validation.pointState.complete,
    occupationFormulaText: validation.pointState.formula,
    occupationHasFormulaChoices: validation.pointState.optionalTerms.length > 1,
    occupationHasDecisions: validation.pointState.optionalTerms.length > 1
      || occupationChoiceGroups.length > 0
      || process.personalSelections.length > 0,
    occupationPersonalChoices: process.personalSelections.map((selection) => ({
      options: OccupationSkillService.skillOptions({
        definition,
        process,
        slotIndex: selection.slotIndex
      }).map((skill) => ({
        ...skill,
        selected: skill.cocid === selection.cocid
      })),
      number: selection.slotIndex + 1,
      selectedCocid: selection.cocid,
      slotIndex: selection.slotIndex
    })),
    occupationPointTotal: validation.pointState.total,
    occupationPointIcon: pointPresentation.icon,
    occupationPointStatus: pointPresentation.label,
    occupationPointsRemaining: validation.remaining,
    occupationPointsSpent: validation.spent,
    occupationPointStateClass: pointPresentation.stateClass,
    occupationProcess: process,
    occupationSkillChoicesComplete: validation.choicesComplete,
    occupationSkillRows: skills.map((skill) => {
      const total = SkillAllocationService.creationTotal(skill);
      const rowValidation = allocationValidation.get(skill.slotId);
      const isCredit = skill.cocid === CREDIT_COCID;
      const available = Math.max(0, validation.remaining + skill.occupation);
      const occupationMin = isCredit
        ? Math.max(0, (definition.creditMin ?? 0) - skill.base - skill.personal)
        : 0;
      const occupationMax = isCredit && definition.creditMax !== null
        ? Math.min(available, Math.max(0, definition.creditMax - skill.base - skill.personal))
        : available;
      const source = occupationSkillSourcePresentation(skill);
      const nameField = skillNameFieldPresentation(skill);
      const totalWarning = skillTotalWarning(total);
      return {
        ...skill,
        canEditOccupation: skill.cocid !== "i.skill.cthulhu-mythos"
          && (occupationMax > 0 || skill.occupation > 0),
        creditMax: isCredit ? definition.creditMax : null,
        creditMin: isCredit ? (definition.creditMin ?? 0) : null,
        invalid: !(rowValidation?.valid && rowValidation?.mythosValid),
        occupationMax,
        occupationMin,
        sourceClass: source.className,
        sourceLabel: source.label,
        sourceRank: source.rank,
        specializationLabel: nameField.label,
        specializationPlaceholder: nameField.placeholder,
        total,
        totalWarning: totalWarning.active,
        totalWarningTitle: totalWarning.title
      };
    }).sort(compareOccupationSkillRows),
    occupationSkillsComplete: validation.valid,
    occupationSkillsLoadFailed: false,
    occupationSpecializationsComplete: validation.specializationsComplete,
    occupationCreditValid: validation.creditValid,
    occupationPersonalComplete: validation.personalComplete,
    occupationOverspent: validation.remaining < 0
  };
}

export function occupationSkillsComplete(context) {
  return Boolean(context?.occupationSkillsComplete);
}

function emptyContext() {
  const pointPresentation = allocationPointPresentation({remaining: 0, valid: false});
  return {
    occupationChoiceGroups: [],
    occupationCreditMax: null,
    occupationCreditMin: 0,
    occupationDefinition: null,
    occupationFormulaChoices: [],
    occupationFormulaComplete: false,
    occupationFormulaText: "",
    occupationHasFormulaChoices: false,
    occupationHasDecisions: false,
    occupationPersonalChoices: [],
    occupationPointTotal: 0,
    occupationPointIcon: pointPresentation.icon,
    occupationPointStatus: pointPresentation.label,
    occupationPointsRemaining: 0,
    occupationPointsSpent: 0,
    occupationPointStateClass: pointPresentation.stateClass,
    occupationProcess: null,
    occupationSkillRows: [],
    occupationSkillsComplete: false,
    occupationSkillsLoadFailed: false,
    occupationSpecializationsComplete: false,
    occupationCreditValid: false,
    occupationPersonalComplete: false,
    occupationOverspent: false
  };
}
