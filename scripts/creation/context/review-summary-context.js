import { CHARACTERISTIC_KEYS } from "../constants.js";
import { AgeAdjustmentService } from "../services/age-adjustment-service.js";
import { BackstoryService } from "../services/backstory-service.js";
import { DerivedValuesService } from "../services/derived-values-service.js";
import { PersonalDataService } from "../services/personal-data-service.js";
import { SkillAllocationService } from "../services/skill-allocation-service.js";
import {
  compareSkillNames,
  occupationSkillSourcePresentation
} from "./skill-row-context.js";

const BACKSTORY_FIELDS = Object.freeze([
  ["description", "GINZZZU_C7PH.Creation.Backstory.Description"],
  ["ideology", "GINZZZU_C7PH.Creation.Backstory.Ideology"],
  ["significantPeople", "GINZZZU_C7PH.Creation.Backstory.SignificantPeople"],
  ["meaningfulLocations", "GINZZZU_C7PH.Creation.Backstory.MeaningfulLocations"],
  ["treasuredPossessions", "GINZZZU_C7PH.Creation.Backstory.TreasuredPossessions"],
  ["traits", "GINZZZU_C7PH.Creation.Backstory.Traits"],
  ["injuries", "GINZZZU_C7PH.Creation.Backstory.Injuries"]
]);

function nonNegativeInteger(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function genderLabel(gender) {
  if (!gender) return "—";
  return game.i18n.localize(`GINZZZU_C7PH.Creation.PersonalData.GenderOptions.${gender}`);
}

function identityRows(source) {
  const personalData = PersonalDataService.normalize(source.personalData);
  return [
    ["Name", personalData.name],
    ["Gender", genderLabel(personalData.gender)],
    ["Age", source.age],
    ["Birthplace", personalData.birthplace],
    ["Residence", personalData.residence],
    ["Occupation", source.occupation?.name]
  ].map(([key, value]) => ({
    label: game.i18n.localize(`GINZZZU_C7PH.Creation.Review.Identity.${key}`),
    value: value || "—"
  }));
}

function backstoryRows(source) {
  const backstory = BackstoryService.normalize(source.backstory);
  return BACKSTORY_FIELDS.map(([field, labelKey]) => ({
    label: game.i18n.localize(labelKey),
    value: backstory[field]
  })).filter((entry) => Boolean(entry.value));
}

function skillSourcePresentation(skill) {
  if (skill.isOccupation) return occupationSkillSourcePresentation(skill);
  if (Number(skill.personal) > 0) {
    return {
      className: "is-personal",
      label: game.i18n.localize("GINZZZU_C7PH.Creation.Review.PersonalSkill")
    };
  }
  return {className: "", label: ""};
}

function skillRows(source) {
  return (source.skills ?? []).map((skill) => {
    const presentation = skillSourcePresentation(skill);
    return {
      ...skill,
      sourceClass: presentation.className,
      sourceLabel: presentation.label,
      total: SkillAllocationService.creationTotal(skill)
    };
  }).sort(compareSkillNames);
}

function characteristicRows(source, characteristicLabel) {
  return CHARACTERISTIC_KEYS.map((key) => {
    const entry = source.characteristics?.[key];
    const value = AgeAdjustmentService.finalValue(entry);
    const adjustment = Number(entry?.ageAdjustment ?? 0);
    const ready = Number.isFinite(value);
    return {
      adjustment,
      adjustmentText: adjustment > 0 ? `+${adjustment}` : String(adjustment),
      extreme: ready ? Math.floor(value / 5) : "—",
      half: ready ? Math.floor(value / 2) : "—",
      key,
      label: characteristicLabel(key),
      ready,
      value: ready ? value : "—"
    };
  });
}

function derivedRows(source, ready) {
  if (!ready) return [];
  const calculated = DerivedValuesService.calculate({
    age: source.age,
    characteristics: source.characteristics
  });
  return [
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
}

function pointPool(source, field, supplied) {
  if (supplied) {
    return {
      spent: nonNegativeInteger(supplied.spent),
      total: nonNegativeInteger(supplied.total)
    };
  }

  return {
    spent: (source.skills ?? []).reduce(
      (sum, skill) => sum + nonNegativeInteger(skill?.[field]),
      0
    ),
    total: 0
  };
}

export function buildReviewSummaryContext({
  characteristicLabel = (key) => game.i18n.localize(`CHARAC.${key.toUpperCase()}`),
  occupationPoints = null,
  personalPoints = null,
  source = {}
} = {}) {
  const characteristics = characteristicRows(source, characteristicLabel);
  const derivedReady = AgeAdjustmentService.isComplete({
    age: source.age,
    ageProcess: source.ageProcess,
    characteristics: source.characteristics
  });
  const backstory = backstoryRows(source);
  const skills = skillRows(source);
  const occupation = pointPool(source, "occupation", occupationPoints);
  const personal = pointPool(source, "personal", personalPoints);

  return {
    reviewBackstory: backstory,
    reviewCharacteristics: characteristics,
    reviewDerivedReady: derivedReady,
    reviewDerivedValues: derivedRows(source, derivedReady),
    reviewHasBackstory: backstory.length > 0,
    reviewHasCharacteristics: characteristics.some((entry) => entry.ready),
    reviewHasSkills: skills.length > 0,
    reviewIdentity: identityRows(source),
    reviewOccupationPointsSpent: occupation.spent,
    reviewOccupationPointsTotal: occupation.total,
    reviewPersonalPointsSpent: personal.spent,
    reviewPersonalPointsTotal: personal.total,
    reviewSkillRows: skills
  };
}
