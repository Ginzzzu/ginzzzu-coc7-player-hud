import { CREATION_STEPS } from "../constants.js";
import { CreationSourceService } from "../services/creation-source-service.js";
import { InvestigatorCreationService } from "../services/investigator-creation-service.js";
import { InvestigatorValidationService } from "../services/investigator-validation-service.js";
import { buildReviewSummaryContext } from "./review-summary-context.js";

function characteristicLabel(application, key) {
  return CreationSourceService.selectedSetup({
    draft: application._draft,
    sources: application._sources
  })?.characteristicFormulas?.find((definition) => definition.key === key)?.label
    ?? game.i18n.localize(`CHARAC.${key.toUpperCase()}`);
}

function statusPresentation({availability, valid}) {
  if (!valid) {
    return {
      className: "is-invalid",
      hint: game.i18n.localize("GINZZZU_C7PH.Creation.Review.InvalidHint"),
      icon: "fa-triangle-exclamation",
      title: game.i18n.localize("GINZZZU_C7PH.Creation.Review.InvalidTitle")
    };
  }

  if (!availability.available) {
    const key = {
      noPermission: "AssignedActorPermission",
      unassigned: "AssignedActorMissing",
      wrongType: "AssignedActorWrongType"
    }[availability.reason] ?? "AssignedActorMissing";
    return {
      className: "is-invalid",
      hint: game.i18n.localize(`GINZZZU_C7PH.Creation.Review.${key}Hint`),
      icon: "fa-user-slash",
      title: game.i18n.localize(`GINZZZU_C7PH.Creation.Review.${key}Title`)
    };
  }

  return {
    className: "is-ready",
    hint: game.i18n.format("GINZZZU_C7PH.Creation.Review.AssignedActorReadyHint", {
      actor: availability.actor.name
    }),
    icon: "fa-circle-check",
    title: game.i18n.localize("GINZZZU_C7PH.Creation.Review.AssignedActorReadyTitle")
  };
}

export async function prepareReviewContext(application) {
  const source = application._draft?.toObject?.() ?? {};
  const definition = source.occupation?.uuid
    ? await CreationSourceService.getOccupationDefinition(source.occupation.uuid)
    : null;
  const validation = InvestigatorValidationService.validate({definition, draft: source});
  const availability = InvestigatorCreationService.availability();
  const status = statusPresentation({availability, valid: validation.valid});
  const summary = buildReviewSummaryContext({
    characteristicLabel: (key) => characteristicLabel(application, key),
    occupationPoints: {
      spent: validation.occupationValidation?.spent ?? 0,
      total: validation.occupationValidation?.pointState?.total ?? 0
    },
    personalPoints: {
      spent: validation.personalValidation.spent,
      total: validation.personalValidation.pointState.total
    },
    source
  });

  return {
    ...summary,
    reviewCanCreate: validation.valid
      && availability.available
      && !application._creationPending,
    reviewCreating: Boolean(application._creationPending),
    reviewEditSteps: {
      age: CREATION_STEPS.AGE,
      characteristics: CREATION_STEPS.CHARACTERISTICS,
      occupation: CREATION_STEPS.OCCUPATION,
      occupationSkills: CREATION_STEPS.OCCUPATION_SKILLS,
      personalData: CREATION_STEPS.PERSONAL_DATA,
      personalInterests: CREATION_STEPS.PERSONAL_INTERESTS
    },
    reviewIssues: validation.issues.map((entry) => ({
      label: game.i18n.localize(entry.key),
      step: entry.step
    })),
    reviewStatusClass: status.className,
    reviewStatusHint: status.hint,
    reviewStatusIcon: status.icon,
    reviewStatusTitle: status.title,
    reviewValid: validation.valid
  };
}
