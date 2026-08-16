import { MODULE_ID } from "../../constants.js";

const REQUIRED_CHARACTERISTICS = Object.freeze([
  "str",
  "con",
  "siz",
  "dex",
  "app",
  "int",
  "pow",
  "edu"
]);

function managedKind(item) {
  if (!item?.getFlag?.(MODULE_ID, "managedByWizard")) return null;
  return item.getFlag(MODULE_ID, "kind") ?? null;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function hasCompletedWizardItems(actor) {
  let hasOccupation = false;
  let hasSkill = false;

  for (const item of actor.items ?? []) {
    const kind = managedKind(item);
    if (kind === "occupation") hasOccupation = true;
    else if (kind === "skill") hasSkill = true;
    if (hasOccupation && hasSkill) return true;
  }

  return false;
}

function hasFilledCharacteristics(actor) {
  const characteristics = actor.system?.characteristics ?? {};
  return REQUIRED_CHARACTERISTICS.every((key) => (
    positiveNumber(characteristics[key]?.value)
  )) && positiveNumber(actor.system?.attribs?.lck?.value);
}

function hasOccupation(actor) {
  const occupationName = String(actor.system?.infos?.occupation ?? "").trim();
  return Boolean(occupationName)
    || [...(actor.items ?? [])].some((item) => item.type === "occupation");
}

function hasSkills(actor) {
  return [...(actor.items ?? [])].some((item) => item.type === "skill");
}

function hasFilledSheet(actor) {
  return hasFilledCharacteristics(actor)
    && hasOccupation(actor)
    && hasSkills(actor);
}

export class CreationCompletionService {
  static isCompletedActor(actor) {
    if (!actor || actor.type !== "character") return false;
    return hasCompletedWizardItems(actor) || hasFilledSheet(actor);
  }
}
