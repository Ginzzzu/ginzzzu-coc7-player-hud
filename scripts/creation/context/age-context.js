import { CHARACTERISTIC_KEYS } from "../constants.js";
import { AgeAdjustmentService } from "../services/age-adjustment-service.js";
import { CreationSourceService } from "../services/creation-source-service.js";

function draftObject(application) {
  return application._draft?.toObject?.() ?? {};
}

function labelFor(application, key) {
  return CreationSourceService.selectedSetup({
    draft: application._draft,
    sources: application._sources
  })?.characteristicFormulas?.find((definition) => definition.key === key)?.label
    ?? game.i18n.localize(`CHARAC.${key.toUpperCase()}`);
}

function adjustmentCard(application, key, policy, characteristics, deduction) {
  const entry = characteristics[key] ?? {};
  const base = AgeAdjustmentService.baseValue(entry);
  const adjustment = Number(entry.ageAdjustment ?? 0);
  const finalValue = AgeAdjustmentService.finalValue(entry);
  const isDeduction = policy?.deduction?.from.includes(key) ?? false;
  const fixed = !isDeduction && adjustment !== 0;
  const used = Math.max(0, -adjustment);
  const canDeductOne = isDeduction && deduction.remaining > 0 && finalValue > 1;
  const canDeductFive = isDeduction && deduction.remaining >= 5 && finalValue > 5;
  const canRestoreOne = isDeduction && used > 0;
  const canRestoreFive = isDeduction && used >= 5;

  return {
    adjustment,
    adjustmentText: adjustment > 0 ? `+${adjustment}` : String(adjustment),
    base,
    canDeductFive,
    canDeductOne,
    canRestoreFive,
    canRestoreOne,
    finalValue,
    fixed,
    isDeduction,
    key,
    label: labelFor(application, key),
    used
  };
}

export function prepareAgeContext(application) {
  const source = draftObject(application);
  const age = AgeAdjustmentService.normalizeAge(source.age);
  const policy = AgeAdjustmentService.policy(age);
  const characteristics = source.characteristics ?? {};
  const ageProcess = source.ageProcess ?? {};
  const deduction = AgeAdjustmentService.deductionState({age, characteristics});
  const education = AgeAdjustmentService.educationState({age, ageProcess});
  const complete = AgeAdjustmentService.isComplete({
    age,
    ageProcess,
    characteristics
  });
  const educationCurrent = AgeAdjustmentService.finalValue(characteristics.edu);
  const luckBase = AgeAdjustmentService.baseValue(characteristics.luck);
  const luckFinal = AgeAdjustmentService.finalValue(characteristics.luck);
  const secondLuck = Number(ageProcess.luckSecondRoll);
  const hasSecondLuck = (
    ageProcess.luckSecondRoll !== null
    && ageProcess.luckSecondRoll !== undefined
    && Number.isFinite(secondLuck)
  );

  return {
    age,
    ageAdjustmentCards: policy
      ? CHARACTERISTIC_KEYS
        .filter((key) => (
          policy.deduction?.from.includes(key)
          || Object.hasOwn(policy.fixedAdjustments, key)
          || (key === "edu" && policy.educationChecks > 0)
        ))
        .map((key) => adjustmentCard(
          application,
          key,
          policy,
          characteristics,
          deduction
        ))
      : [],
    ageBandLabel: policy
      ? game.i18n.localize(`GINZZZU_C7PH.Creation.Age.Bands.${policy.band}`)
      : "",
    ageCanRollEducation: Boolean(policy?.educationChecks && education.remaining > 0),
    ageCanRollLuck: Boolean(policy?.luckSecondRoll && !hasSecondLuck),
    ageComplete: complete,
    ageDeductionFrom: deduction.from.map((key) => labelFor(application, key)).join(", "),
    ageDeductionPercent: deduction.total > 0
      ? Math.round((deduction.used / deduction.total) * 100)
      : 0,
    ageDeductionRemaining: deduction.remaining,
    ageDeductionTotal: deduction.total,
    ageDeductionUsed: deduction.used,
    ageEducationAttempts: education.attempts.map((attempt, index) => ({
      ...attempt,
      index: index + 1,
      resultLabel: game.i18n.localize(
        attempt.success
          ? "GINZZZU_C7PH.Creation.Age.Education.Success"
          : "GINZZZU_C7PH.Creation.Age.Education.Failure"
      )
    })),
    ageEducationComplete: education.complete,
    ageEducationCurrent: educationCurrent,
    ageEducationRemaining: education.remaining,
    ageEducationRequired: education.required,
    ageHasPolicy: Boolean(policy),
    ageLuckBase: luckBase,
    ageLuckFinal: luckFinal,
    ageLuckHasSecondRoll: hasSecondLuck,
    ageLuckSecondRoll: hasSecondLuck ? secondLuck : null,
    ageMax: AgeAdjustmentService.maxAge,
    ageMin: AgeAdjustmentService.minAge,
    ageMovementPenalty: policy?.movementPenalty ?? 0,
    agePolicy: policy,
    ageValid: Boolean(policy)
  };
}

export function ageComplete(application) {
  const source = draftObject(application);
  return AgeAdjustmentService.isComplete({
    age: source.age,
    ageProcess: source.ageProcess,
    characteristics: source.characteristics
  });
}
