import {
  CREATION_CHARACTERISTIC_METHODS,
  POINT_BUY_CHARACTERISTIC_KEYS,
  POINT_BUY_CHARACTERISTIC_MAX,
  POINT_BUY_CHARACTERISTIC_MIN,
  POINT_BUY_CHARACTERISTIC_MINIMUMS
} from "../constants.js";
import { CharacteristicSwapService } from "./characteristic-swap-service.js";

function integer(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class CharacteristicPointService {
  static isPointMethod(draft) {
    const source = draft?.toObject?.() ?? draft ?? {};
    return source.setup?.characteristicMethod === CREATION_CHARACTERISTIC_METHODS.POINTS;
  }

  static budget(draft) {
    const source = draft?.toObject?.() ?? draft ?? {};
    return Math.max(0, integer(source.setup?.pointBudget));
  }

  static minimum(key) {
    return POINT_BUY_CHARACTERISTIC_MINIMUMS[key] ?? POINT_BUY_CHARACTERISTIC_MIN;
  }

  static maximum() {
    return POINT_BUY_CHARACTERISTIC_MAX;
  }

  static initialize(characteristics = {}) {
    const next = foundry.utils.deepClone(characteristics ?? {});
    for (const key of POINT_BUY_CHARACTERISTIC_KEYS) {
      if (!next[key]) continue;
      next[key].ageAdjustment = 0;
      next[key].assignedValue = this.minimum(key);
      next[key].rolledValue = null;
    }
    if (next.luck) {
      next.luck.ageAdjustment = 0;
      next.luck.assignedValue = null;
      next.luck.rolledValue = null;
    }
    return next;
  }

  static allocationState(draft) {
    const source = draft?.toObject?.() ?? draft ?? {};
    const characteristics = source.characteristics ?? {};
    const budget = this.budget(source);
    const values = Object.fromEntries(POINT_BUY_CHARACTERISTIC_KEYS.map((key) => {
      const value = CharacteristicSwapService.currentValue(characteristics[key]);
      return [key, Number.isFinite(value) ? integer(value) : null];
    }));
    const spent = POINT_BUY_CHARACTERISTIC_KEYS.reduce(
      (total, key) => total + (Number.isInteger(values[key]) ? values[key] : 0),
      0
    );
    const valid = POINT_BUY_CHARACTERISTIC_KEYS.every((key) => (
      Number.isInteger(values[key])
      && values[key] >= this.minimum(key)
      && values[key] <= POINT_BUY_CHARACTERISTIC_MAX
    ));
    const luck = CharacteristicSwapService.currentValue(characteristics.luck);
    const luckReady = Number.isFinite(luck);

    return {
      budget,
      complete: budget > 0 && valid && spent === budget && luckReady,
      luckReady,
      remaining: budget - spent,
      spent,
      valid,
      values
    };
  }

  static update({characteristics, draft, key, value}) {
    if (!POINT_BUY_CHARACTERISTIC_KEYS.includes(key)) return null;

    const next = foundry.utils.deepClone(characteristics ?? {});
    if (!next[key]) return null;

    const state = this.allocationState({
      ...(draft?.toObject?.() ?? draft ?? {}),
      characteristics: next
    });
    const current = Number.isInteger(state.values[key])
      ? state.values[key]
      : this.minimum(key);
    const requested = integer(value, current);
    const maximumFromBudget = current + Math.max(0, state.remaining);
    const maximum = Math.min(POINT_BUY_CHARACTERISTIC_MAX, maximumFromBudget);
    const normalized = Math.max(this.minimum(key), Math.min(maximum, requested));
    if (normalized === current) return null;

    next[key].ageAdjustment = 0;
    next[key].assignedValue = normalized;
    next[key].rolledValue = null;
    return next;
  }
}
