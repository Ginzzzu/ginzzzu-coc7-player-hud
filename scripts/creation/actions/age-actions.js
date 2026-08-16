import { prepareAgeContext } from "../context/age-context.js";
import { AgeAdjustmentService } from "../services/age-adjustment-service.js";
import { AgeRollService } from "../services/age-roll-service.js";
import { CreationSourceService } from "../services/creation-source-service.js";
import { DraftService } from "../services/draft-service.js";
import { OccupationSkillService } from "../services/occupation-skill-service.js";

function draftObject(application) {
  return application._draft.toObject();
}

export async function setAge(application, value) {
  const blank = value === "" || value === null || value === undefined;
  const age = AgeAdjustmentService.normalizeAge(value);
  if (!blank && age === null) {
    application._notifyWarning("GINZZZU_C7PH.Creation.Warnings.AgeRange");
    await application.render({parts: ["main"]});
    return;
  }

  const source = draftObject(application);
  if (
    source.age === age
    && source.ageProcess?.ageAtCalculation === age
  ) return;

  const initialized = AgeAdjustmentService.initialize({
    age,
    characteristics: source.characteristics
  });
  const nextSource = {
    ...source,
    age,
    ageProcess: initialized.ageProcess,
    characteristics: initialized.characteristics
  };
  try {
    let occupationChanges = {};
    if (source.occupation?.uuid) {
      const definition = await CreationSourceService.getOccupationDefinition(
        source.occupation.uuid
      );
      if (definition) {
        occupationChanges = OccupationSkillService.reconcile({
          definition,
          draft: nextSource,
          previousSkills: source.skills
        });
      }
    }

    application._draft = await DraftService.update(application._draft, {
      age,
      ageProcess: initialized.ageProcess,
      characteristics: initialized.characteristics,
      ...occupationChanges
    });
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}

export async function modifyAgeAdjustment(application, target) {
  const source = draftObject(application);
  const characteristics = AgeAdjustmentService.modifyDeduction({
    age: source.age,
    by: target.dataset.by,
    characteristics: source.characteristics,
    key: target.dataset.characteristicKey
  });
  if (!characteristics) return;

  try {
    application._draft = await DraftService.update(application._draft, {characteristics});
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}

export async function rollEducationImprovements(application) {
  const context = prepareAgeContext(application);
  if (!context.ageCanRollEducation || context.ageEducationRemaining < 1) return;

  try {
    const attempts = await AgeRollService.rollEducation({
      count: context.ageEducationRemaining,
      currentEducation: context.ageEducationCurrent
    });
    const source = draftObject(application);
    const result = AgeAdjustmentService.applyEducationResults({
      age: source.age,
      ageProcess: source.ageProcess,
      attempts,
      characteristics: source.characteristics
    });
    if (!result) return;

    application._draft = await DraftService.update(application._draft, result);
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.AgeRoll", error);
  }
}

export async function rollSecondLuck(application) {
  const context = prepareAgeContext(application);
  if (!context.ageCanRollLuck) return;

  const luckDefinition = CreationSourceService.selectedSetup({
    draft: application._draft,
    sources: application._sources
  })?.characteristicFormulas?.find((definition) => definition.key === "luck");
  if (!luckDefinition?.formula) return;

  try {
    const total = await AgeRollService.rollLuck({
      formula: luckDefinition.formula,
      label: luckDefinition.label
    });
    const source = draftObject(application);
    const result = AgeAdjustmentService.applyLuckSecondRoll({
      age: source.age,
      ageProcess: source.ageProcess,
      characteristics: source.characteristics,
      total
    });
    if (!result) return;

    application._draft = await DraftService.update(application._draft, result);
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.AgeRoll", error);
  }
}
