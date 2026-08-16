import { CHARACTERISTIC_KEYS } from "../constants.js";
import { CharacteristicSwapService } from "./characteristic-swap-service.js";

const MIN_AGE = 15;
const MAX_AGE = 89;

function integer(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function emptyAgeProcess(age = null) {
  return {
    ageAtCalculation: Number.isInteger(age) ? age : null,
    educationChecks: [],
    luckSecondRoll: null
  };
}

export class AgeAdjustmentService {
  static get minAge() {
    return MIN_AGE;
  }

  static get maxAge() {
    return MAX_AGE;
  }

  static normalizeAge(value) {
    if (value === "" || value === null || value === undefined) return null;
    const age = Number.parseInt(value, 10);
    return Number.isInteger(age) && age >= MIN_AGE && age <= MAX_AGE ? age : null;
  }

  static isValidAge(value) {
    return this.normalizeAge(value) !== null;
  }

  static policy(value) {
    const age = this.normalizeAge(value);
    if (age === null) return null;

    if (age < 20) {
      return {
        age,
        band: "15to19",
        deduction: {from: ["str", "siz"], total: 5},
        educationChecks: 0,
        fixedAdjustments: {edu: -5},
        luckSecondRoll: true,
        movementPenalty: 0
      };
    }

    if (age < 40) {
      return {
        age,
        band: "20to39",
        deduction: null,
        educationChecks: 1,
        fixedAdjustments: {},
        luckSecondRoll: false,
        movementPenalty: 0
      };
    }

    const decade = Math.floor(age / 10);
    return {
      age,
      band: `${decade}0s`,
      deduction: {
        from: ["str", "con", "dex"],
        total: 5 * (2 ** (decade - 4))
      },
      educationChecks: Math.min(4, decade - 2),
      fixedAdjustments: {app: -5 * (decade - 3)},
      luckSecondRoll: false,
      movementPenalty: decade - 3
    };
  }

  static baseValue(entry = {}) {
    return CharacteristicSwapService.currentValue(entry);
  }

  static finalValue(entry = {}) {
    const base = this.baseValue(entry);
    if (!Number.isFinite(base)) return null;
    return base + integer(entry.ageAdjustment);
  }

  static initialize({age, characteristics}) {
    const policy = this.policy(age);
    const nextCharacteristics = foundry.utils.deepClone(characteristics ?? {});

    for (const key of CHARACTERISTIC_KEYS) {
      if (!nextCharacteristics[key]) continue;
      nextCharacteristics[key].ageAdjustment = 0;
    }

    if (policy) {
      for (const [key, adjustment] of Object.entries(policy.fixedAdjustments)) {
        if (nextCharacteristics[key]) nextCharacteristics[key].ageAdjustment = adjustment;
      }
    }

    return {
      ageProcess: emptyAgeProcess(policy?.age ?? null),
      characteristics: nextCharacteristics
    };
  }

  static resetAfterCharacteristicChange({age, characteristics}) {
    return this.initialize({age, characteristics});
  }

  static deductionState({age, characteristics}) {
    const policy = this.policy(age);
    const deduction = policy?.deduction;
    if (!deduction) return {from: [], remaining: 0, total: 0, used: 0};

    const used = deduction.from.reduce((sum, key) => {
      const adjustment = integer(characteristics?.[key]?.ageAdjustment);
      return sum + Math.max(0, -adjustment);
    }, 0);

    return {
      from: deduction.from,
      remaining: Math.max(0, deduction.total - used),
      total: deduction.total,
      used
    };
  }

  static modifyDeduction({age, by, characteristics, key}) {
    const policy = this.policy(age);
    if (!policy?.deduction?.from.includes(key)) return null;

    const delta = integer(by);
    if (!delta) return null;

    const nextCharacteristics = foundry.utils.deepClone(characteristics ?? {});
    const entry = nextCharacteristics[key];
    const base = this.baseValue(entry);
    if (!entry || !Number.isFinite(base)) return null;

    const current = Math.min(0, integer(entry.ageAdjustment));
    const minimum = 1 - base;
    let next = Math.max(minimum, Math.min(0, current + delta));

    if (next < current) {
      const state = this.deductionState({age, characteristics: nextCharacteristics});
      const requested = current - next;
      const allowed = Math.min(requested, state.remaining);
      next = current - allowed;
    }

    if (next === current) return null;
    entry.ageAdjustment = next;
    return nextCharacteristics;
  }

  static applyEducationResults({age, ageProcess, attempts, characteristics}) {
    const policy = this.policy(age);
    if (!policy?.educationChecks) return null;

    const nextCharacteristics = foundry.utils.deepClone(characteristics ?? {});
    const nextProcess = foundry.utils.deepClone(ageProcess ?? emptyAgeProcess(policy.age));
    const currentAttempts = Array.isArray(nextProcess.educationChecks)
      ? nextProcess.educationChecks
      : [];
    const accepted = (attempts ?? []).slice(
      0,
      Math.max(0, policy.educationChecks - currentAttempts.length)
    );
    const gain = accepted.reduce((sum, attempt) => sum + integer(attempt.gain), 0);

    if (nextCharacteristics.edu) {
      nextCharacteristics.edu.ageAdjustment = integer(
        nextCharacteristics.edu.ageAdjustment
      ) + gain;
    }

    nextProcess.ageAtCalculation = policy.age;
    nextProcess.educationChecks = currentAttempts.concat(accepted);

    return {
      ageProcess: nextProcess,
      characteristics: nextCharacteristics
    };
  }

  static applyLuckSecondRoll({age, ageProcess, characteristics, total}) {
    const policy = this.policy(age);
    if (!policy?.luckSecondRoll || !Number.isFinite(Number(total))) return null;

    const nextCharacteristics = foundry.utils.deepClone(characteristics ?? {});
    const nextProcess = foundry.utils.deepClone(ageProcess ?? emptyAgeProcess(policy.age));
    const base = this.baseValue(nextCharacteristics.luck);
    if (!Number.isFinite(base)) return null;

    const secondRoll = integer(total);
    nextCharacteristics.luck.ageAdjustment = Math.max(0, secondRoll - base);
    nextProcess.ageAtCalculation = policy.age;
    nextProcess.luckSecondRoll = secondRoll;

    return {
      ageProcess: nextProcess,
      characteristics: nextCharacteristics
    };
  }

  static educationState({age, ageProcess}) {
    const policy = this.policy(age);
    const attempts = Array.isArray(ageProcess?.educationChecks)
      ? ageProcess.educationChecks
      : [];
    const required = policy?.educationChecks ?? 0;
    return {
      attempts,
      complete: attempts.length >= required,
      remaining: Math.max(0, required - attempts.length),
      required
    };
  }

  static isComplete({age, ageProcess, characteristics}) {
    const policy = this.policy(age);
    if (!policy || ageProcess?.ageAtCalculation !== policy.age) return false;

    const education = this.educationState({age, ageProcess});
    if (!education.complete) return false;

    const deduction = this.deductionState({age, characteristics});
    if (deduction.used !== deduction.total) return false;

    if (
      policy.luckSecondRoll
      && (
        ageProcess?.luckSecondRoll === null
        || ageProcess?.luckSecondRoll === undefined
        || !Number.isFinite(Number(ageProcess.luckSecondRoll))
      )
    ) {
      return false;
    }

    for (const key of policy.deduction?.from ?? []) {
      const finalValue = this.finalValue(characteristics?.[key]);
      if (!Number.isFinite(finalValue) || finalValue < 1) return false;
    }

    return true;
  }
}
