import {
  CHARACTERISTIC_KEYS,
  CREATION_PROGRESS_SCHEMA_VERSION,
  CREATION_PROGRESS_STATUSES,
  CREATION_STEPS
} from "../constants.js";
import { AgeAdjustmentService } from "./age-adjustment-service.js";
import { CharacteristicPointService } from "./characteristic-point-service.js";
import { CreationSourceService } from "./creation-source-service.js";
import { InvestigatorValidationService } from "./investigator-validation-service.js";

function characteristicsComplete(source) {
  if (CharacteristicPointService.isPointMethod(source)) {
    return CharacteristicPointService.allocationState(source).complete;
  }
  return CHARACTERISTIC_KEYS.every((key) => (
    Number.isFinite(AgeAdjustmentService.finalValue(source.characteristics?.[key]))
  ));
}

function addStep(steps, condition, step) {
  if (condition) steps.push(step);
}

export class CreationProgressStateService {
  static async build({actor, completed = false, draft, previous = null, user}) {
    const source = draft?.toObject?.() ?? foundry.utils.deepClone(draft ?? {});
    const definition = source.occupation?.uuid
      ? await CreationSourceService.getOccupationDefinition(source.occupation.uuid)
      : null;
    const validation = InvestigatorValidationService.validate({definition, draft: source});
    const characteristicReady = characteristicsComplete(source);
    const ageReady = AgeAdjustmentService.isComplete({
      age: source.age,
      ageProcess: source.ageProcess,
      characteristics: source.characteristics
    });
    const occupationReady = Boolean(source.occupation?.uuid && definition);
    const occupationSkillsReady = Boolean(validation.occupationValidation?.valid);
    const personalInterestsReady = Boolean(validation.personalValidation?.valid);
    const personalDataReady = Boolean(validation.personalDataValidation?.complete);
    const completedSteps = [];

    addStep(completedSteps, Boolean(source.setup?.uuid), CREATION_STEPS.SETUP);
    addStep(completedSteps, characteristicReady, CREATION_STEPS.CHARACTERISTICS);
    addStep(completedSteps, ageReady, CREATION_STEPS.AGE);
    addStep(completedSteps, characteristicReady && ageReady, CREATION_STEPS.DERIVED);
    addStep(completedSteps, occupationReady, CREATION_STEPS.OCCUPATION);
    addStep(completedSteps, occupationSkillsReady, CREATION_STEPS.OCCUPATION_SKILLS);
    addStep(completedSteps, personalInterestsReady, CREATION_STEPS.PERSONAL_INTERESTS);
    addStep(completedSteps, personalDataReady, CREATION_STEPS.PERSONAL_DATA);
    addStep(completedSteps, validation.valid, CREATION_STEPS.REVIEW);

    const now = Date.now();
    const status = completed
      ? CREATION_PROGRESS_STATUSES.COMPLETED
      : (validation.valid
        ? CREATION_PROGRESS_STATUSES.READY
        : CREATION_PROGRESS_STATUSES.IN_PROGRESS);

    return {
      actorId: actor.id,
      completedAt: completed ? now : null,
      completedSteps,
      currentStep: completed ? CREATION_STEPS.REVIEW : source.currentStep,
      draft: foundry.utils.deepClone(source),
      investigatorName: String(source.personalData?.name ?? "").trim(),
      isValid: validation.valid,
      issues: validation.issues.map((entry) => ({
        key: entry.key,
        step: entry.step
      })),
      occupationName: String(source.occupation?.name ?? "").trim(),
      occupationPoints: {
        spent: validation.occupationValidation?.spent ?? 0,
        total: validation.occupationValidation?.pointState?.total ?? 0
      },
      personalPoints: {
        spent: validation.personalValidation?.spent ?? 0,
        total: validation.personalValidation?.pointState?.total ?? 0
      },
      schemaVersion: CREATION_PROGRESS_SCHEMA_VERSION,
      startedAt: (
        !completed
        && previous?.status === CREATION_PROGRESS_STATUSES.COMPLETED
      ) ? now : (Number(previous?.startedAt) || now),
      status,
      updatedAt: now,
      userId: user.id
    };
  }
}
