import {
  CHARACTERISTIC_KEYS,
  CREATION_STEPS
} from "../constants.js";
import { AgeAdjustmentService } from "./age-adjustment-service.js";
import { CharacteristicPointService } from "./characteristic-point-service.js";
import { OccupationSkillService } from "./occupation-skill-service.js";
import { PersonalDataService } from "./personal-data-service.js";
import { PersonalInterestService } from "./personal-interest-service.js";

function issue(key, step) {
  return {key, step};
}

function characteristicsComplete(draft) {
  if (CharacteristicPointService.isPointMethod(draft)) {
    return CharacteristicPointService.allocationState(draft).complete;
  }
  return CHARACTERISTIC_KEYS.every((key) => (
    Number.isFinite(AgeAdjustmentService.finalValue(draft.characteristics?.[key]))
  ));
}

export class InvestigatorValidationService {
  static validate({definition, draft}) {
    const source = draft?.toObject?.() ?? draft ?? {};
    const issues = [];

    if (!source.setup?.uuid) {
      issues.push(issue("GINZZZU_C7PH.Creation.Review.Issues.Setup", CREATION_STEPS.SETUP));
    }

    if (!characteristicsComplete(source)) {
      issues.push(issue(
        "GINZZZU_C7PH.Creation.Review.Issues.Characteristics",
        CREATION_STEPS.CHARACTERISTICS
      ));
    }

    const ageValid = AgeAdjustmentService.isComplete({
      age: source.age,
      ageProcess: source.ageProcess,
      characteristics: source.characteristics
    });
    if (!ageValid) {
      issues.push(issue("GINZZZU_C7PH.Creation.Review.Issues.Age", CREATION_STEPS.AGE));
    }

    if (!source.occupation?.uuid || !definition) {
      issues.push(issue(
        "GINZZZU_C7PH.Creation.Review.Issues.Occupation",
        CREATION_STEPS.OCCUPATION
      ));
    }

    let occupationValidation = null;
    if (definition) {
      occupationValidation = OccupationSkillService.validate({
        definition,
        draft: source,
        process: source.occupationProcess,
        skills: source.skills
      });
      if (!occupationValidation.valid) {
        issues.push(issue(
          "GINZZZU_C7PH.Creation.Review.Issues.OccupationSkills",
          CREATION_STEPS.OCCUPATION_SKILLS
        ));
      }
    }

    const personalValidation = PersonalInterestService.validate({
      draft: source,
      skills: source.skills
    });
    if (!personalValidation.valid) {
      issues.push(issue(
        "GINZZZU_C7PH.Creation.Review.Issues.PersonalInterests",
        CREATION_STEPS.PERSONAL_INTERESTS
      ));
    }

    const personalDataValidation = PersonalDataService.validate(source.personalData);
    if (!personalDataValidation.complete) {
      issues.push(issue(
        "GINZZZU_C7PH.Creation.Review.Issues.PersonalData",
        CREATION_STEPS.PERSONAL_DATA
      ));
    }

    return {
      issues,
      occupationValidation,
      personalDataValidation,
      personalValidation,
      valid: issues.length === 0
    };
  }
}
