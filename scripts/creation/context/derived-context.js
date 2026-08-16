import { CHARACTERISTIC_KEYS } from "../constants.js";
import { ageComplete } from "./age-context.js";
import { AgeAdjustmentService } from "../services/age-adjustment-service.js";
import { DerivedValuesService } from "../services/derived-values-service.js";
import { CreationSourceService } from "../services/creation-source-service.js";

function labelFor(application, key) {
  return CreationSourceService.selectedSetup({
    draft: application._draft,
    sources: application._sources
  })?.characteristicFormulas?.find((definition) => definition.key === key)?.label
    ?? game.i18n.localize(`CHARAC.${key.toUpperCase()}`);
}

export function prepareDerivedContext(application) {
  if (!ageComplete(application)) {
    return {
      derivedCharacteristics: [],
      derivedReady: false,
      derivedValues: []
    };
  }

  const source = application._draft.toObject();
  const calculated = DerivedValuesService.calculate({
    age: source.age,
    characteristics: source.characteristics
  });
  const derivedCharacteristics = CHARACTERISTIC_KEYS.map((key) => {
    const value = calculated.characteristics[key].value;
    const adjustment = Number(source.characteristics[key]?.ageAdjustment ?? 0);
    return {
      adjustment,
      adjustmentText: adjustment > 0 ? `+${adjustment}` : String(adjustment),
      extreme: Math.floor(value / 5),
      half: Math.floor(value / 2),
      key,
      label: labelFor(application, key),
      value
    };
  });

  const derivedValues = [
    {icon: "fa-solid fa-heart", key: "HP", value: calculated.hp},
    {icon: "fa-solid fa-brain", key: "SAN", value: calculated.sanity},
    {icon: "fa-solid fa-wand-magic-sparkles", key: "MP", value: calculated.mp},
    {icon: "fa-solid fa-person-running", key: "MOV", value: calculated.movement},
    {icon: "fa-solid fa-hand-fist", key: "DB", value: calculated.damageBonus},
    {icon: "fa-solid fa-weight-hanging", key: "Build", value: calculated.build}
  ].map((entry) => ({
    ...entry,
    hint: game.i18n.localize(`GINZZZU_C7PH.Creation.Derived.Hints.${entry.key}`),
    label: game.i18n.localize(`GINZZZU_C7PH.Creation.Derived.Values.${entry.key}`)
  }));

  return {
    derivedAge: source.age,
    derivedCharacteristics,
    derivedReady: true,
    derivedValues
  };
}
