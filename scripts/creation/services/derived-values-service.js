import { CHARACTERISTIC_KEYS } from "../constants.js";
import { AgeAdjustmentService } from "./age-adjustment-service.js";

function pointsFromCharacteristics(characteristics) {
  const points = {};
  for (const key of CHARACTERISTIC_KEYS) {
    const value = AgeAdjustmentService.finalValue(characteristics?.[key]);
    points[key] = {value: Number.isFinite(value) ? value : 0};
  }
  return points;
}

function fallbackDamageBonus(points) {
  const sum = points.str.value + points.siz.value;
  if (sum < 65) return -2;
  if (sum < 85) return -1;
  if (sum < 125) return 0;
  if (sum < 165) return "1D4";
  return `${Math.floor((sum - 45) / 80)}D6`;
}

function fallbackBuild(points) {
  const sum = points.str.value + points.siz.value;
  if (sum < 65) return -2;
  if (sum < 85) return -1;
  if (sum < 125) return 0;
  if (sum < 165) return 1;
  return Math.floor((sum - 45) / 80) + 1;
}

function fallbackMovement(points, _type, age) {
  const {dex, siz, str} = {
    dex: points.dex.value,
    siz: points.siz.value,
    str: points.str.value
  };
  let movement = dex > siz && str > siz ? 9 : (dex >= siz || str >= siz ? 8 : 7);
  if (!game.settings.get("CoC7", "pulpRuleIgnoreAgePenalties") && age >= 40) {
    movement -= Math.floor(age / 10) - 3;
  }
  return Math.max(0, movement);
}

function callSystem(method, fallback, ...args) {
  const actorClass = CONFIG.Actor?.documentClass;
  if (typeof actorClass?.[method] === "function") {
    try {
      return actorClass[method](...args);
    } catch (error) {
      console.error(`ginzzzu-coc7-player-hud | CoC7 ${method} failed; using fallback`, error);
    }
  }
  return fallback(...args);
}

export class DerivedValuesService {
  static calculate({age, characteristics}) {
    const points = pointsFromCharacteristics(characteristics);
    const hp = callSystem(
      "hpFromCharacteristics",
      (source) => Math.floor((source.siz.value + source.con.value) / (
        game.settings.get("CoC7", "pulpRuleDoubleMaxHealth") ? 5 : 10
      )),
      points,
      "character"
    );
    const mp = callSystem(
      "mpFromCharacteristics",
      (source) => Math.floor(source.pow.value / 5),
      points
    );
    const movement = callSystem(
      "movFromCharacteristics",
      fallbackMovement,
      points,
      "character",
      age
    );
    const damageBonus = callSystem(
      "dbFromCharacteristics",
      fallbackDamageBonus,
      points
    );
    const build = callSystem(
      "buildFromCharacteristics",
      fallbackBuild,
      points
    );

    return {
      build,
      characteristics: points,
      damageBonus,
      hp,
      luck: points.luck.value,
      movement,
      mp,
      sanity: points.pow.value
    };
  }
}
