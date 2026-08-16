import { MODULE_ID } from "../constants.js";

const LUCK_MIN = 0;
const LUCK_MAX = 99;
const LUCK_STEP = 1;
const LUCK_STEP_LARGE = 5;

export class LuckService {
  static async adjust(actor, direction, {largeStep = false} = {}) {
    if (!actor?.isOwner) return null;

    const normalizedDirection = Math.sign(Number(direction));
    if (![-1, 1].includes(normalizedDirection)) return null;

    const current = this.value(actor);
    const step = largeStep ? LUCK_STEP_LARGE : LUCK_STEP;
    const value = Math.min(LUCK_MAX, Math.max(LUCK_MIN, current + (normalizedDirection * step)));
    if (value === current) return {changed: false, current, value};

    try {
      await actor.update({"system.attribs.lck.value": value});
      return {changed: true, current, value};
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to adjust Luck`, error);
      throw error;
    }
  }

  static value(actor) {
    const value = Number(actor?.system?.attribs?.lck?.value);
    return Number.isFinite(value) ? value : LUCK_MIN;
  }
}
