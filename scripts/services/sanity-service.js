import { MODULE_ID } from "../constants.js";

const SANITY_MIN = 0;
const SANITY_MAX_DEFAULT = 99;
const SANITY_STEP = 1;
const SANITY_STEP_LARGE = 5;

export class SanityService {
  static async adjust(actor, direction, {largeStep = false} = {}) {
    if (!actor?.isOwner) return null;

    const normalizedDirection = Math.sign(Number(direction));
    if (![-1, 1].includes(normalizedDirection)) return null;

    const current = this.value(actor);
    const maximum = this.maximum(actor);
    const step = largeStep ? SANITY_STEP_LARGE : SANITY_STEP;
    const value = Math.min(maximum, Math.max(SANITY_MIN, current + (normalizedDirection * step)));
    if (value === current) return {changed: false, current, value};

    try {
      await actor.update({"system.attribs.san.value": value});
      return {changed: true, current, value};
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to adjust Sanity`, error);
      throw error;
    }
  }

  static maximum(actor) {
    const maximum = Number(actor?.system?.attribs?.san?.max);
    return Number.isFinite(maximum) && maximum > SANITY_MIN ? maximum : SANITY_MAX_DEFAULT;
  }

  static value(actor) {
    const value = Number(actor?.system?.attribs?.san?.value);
    return Number.isFinite(value) ? value : SANITY_MIN;
  }
}
