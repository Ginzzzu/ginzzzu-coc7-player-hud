import { PersonalInterestService } from "../services/personal-interest-service.js";
import { SkillAllocationService } from "../services/skill-allocation-service.js";
import {
  compareSkillNames,
  occupationSkillSourcePresentation,
  skillNameFieldPresentation,
  skillTotalWarning
} from "./skill-row-context.js";
import { allocationPointPresentation } from "./allocation-point-presentation.js";

const CREDIT_COCID = "i.skill.credit-rating";
const MYTHOS_COCID = "i.skill.cthulhu-mythos";
const OWN_LANGUAGE_COCID = "i.skill.language-own-ru";

export function preparePersonalInterestsContext(application) {
  const source = application._draft?.toObject?.() ?? {};
  const skillOptions = application._sources?.skills ?? [];
  const reconciled = PersonalInterestService.reconcile({
    draft: source,
    skillOptions
  });
  const validation = PersonalInterestService.validate({
    draft: source,
    skills: reconciled.skills
  });
  const pointPresentation = allocationPointPresentation({
    remaining: validation.remaining,
    valid: validation.valid
  });
  const rowValidation = new Map(
    validation.skillValidation.map((entry) => [entry.slotId, entry])
  );

  const ownLanguage = reconciled.skills.find((skill) => (
    (skill.sourceCocid ?? skill.cocid) === OWN_LANGUAGE_COCID
  ));

  return {
    personalOwnLanguage: ownLanguage ? {
      specialization: ownLanguage.specialization ?? "",
      slotId: ownLanguage.slotId,
      valid: Boolean(String(ownLanguage.specialization ?? "").trim())
    } : null,
    personalInterestRows: reconciled.skills.map((skill) => {
      const sourcePresentation = skill.isOccupation
        ? occupationSkillSourcePresentation(skill)
        : {className: "", label: ""};
      const skillValidation = rowValidation.get(skill.slotId);
      const nameField = skillNameFieldPresentation(skill);
      const creditInvalid = skill.cocid === CREDIT_COCID
        && !validation.creditValid;
      const personalMax = PersonalInterestService.personalMaximum({draft: source, skill});
      const total = SkillAllocationService.creationTotal(skill);
      const totalWarning = skillTotalWarning(total);
      return {
        ...skill,
        canEditPersonal: skill.cocid !== MYTHOS_COCID
          && (personalMax > 0 || skill.personal > 0),
        canEditSpecialization: Boolean(
          skill.requiresName
          && !skill.isOccupation
          && (skill.sourceCocid ?? skill.cocid) !== OWN_LANGUAGE_COCID
        ),
        invalid: creditInvalid || !(
          skillValidation?.valid
          && skillValidation?.mythosValid
          && skillValidation?.specializationValid
        ),
        personalMax,
        personalMin: 0,
        sourceClass: sourcePresentation.className,
        sourceLabel: sourcePresentation.label,
        specializationLabel: nameField.label,
        specializationPlaceholder: nameField.placeholder,
        total,
        totalWarning: totalWarning.active,
        totalWarningTitle: totalWarning.title
      };
    }).sort(compareSkillNames),
    personalInterestsComplete: validation.valid,
    personalInterestsFormulaText: game.i18n.localize(
      "GINZZZU_C7PH.Creation.PersonalInterests.Formula"
    ),
    personalInterestsPointIcon: pointPresentation.icon,
    personalInterestsPointStateClass: pointPresentation.stateClass,
    personalInterestsPointStatus: pointPresentation.label,
    personalInterestsPointsSpent: validation.spent,
    personalInterestsPointTotal: validation.pointState.total
  };
}

export function personalInterestsComplete(context) {
  return Boolean(context?.personalInterestsComplete);
}
