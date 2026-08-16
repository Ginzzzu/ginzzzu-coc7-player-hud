import { MODULE_ID } from "../../constants.js";
import { CHARACTERISTIC_KEYS } from "../../creation/constants.js";
import {
  compareSkillNames,
  occupationSkillSourcePresentation
} from "../../creation/context/skill-row-context.js";

const DERIVED_FIELDS = Object.freeze([
  Object.freeze({icon: "fa-solid fa-heart", key: "HP", paths: ["attribs.hp.max", "attribs.hp.value"]}),
  Object.freeze({icon: "fa-solid fa-brain", key: "SAN", paths: ["attribs.san.value", "attribs.san.max"]}),
  Object.freeze({icon: "fa-solid fa-wand-magic-sparkles", key: "MP", paths: ["attribs.mp.max", "attribs.mp.value"]}),
  Object.freeze({icon: "fa-solid fa-person-running", key: "MOV", paths: ["attribs.mov.value", "attribs.mov"]}),
  Object.freeze({icon: "fa-solid fa-hand-fist", key: "DB", paths: ["attribs.db.value", "attribs.db"]}),
  Object.freeze({icon: "fa-solid fa-weight-hanging", key: "Build", paths: ["attribs.build.value", "attribs.build"]})
]);

function localized(path) {
  return game.i18n.localize(path);
}

function nonNegativeInteger(value, fallback = null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.trunc(number));
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object" && "value" in value) return displayValue(value.value);
  return String(value);
}

function readPath(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function firstValue(source, paths) {
  for (const path of paths) {
    const value = displayValue(readPath(source, path));
    if (value !== null) return value;
  }
  return null;
}

function identityRows(actor) {
  const infos = actor.system?.infos ?? {};
  const occupationItem = [...(actor.items ?? [])].find((item) => item.type === "occupation");
  const values = {
    Name: actor.name,
    Gender: infos.sex,
    Age: infos.age,
    Birthplace: infos.birthplace,
    Residence: infos.residence,
    Occupation: infos.occupation || occupationItem?.name
  };

  return Object.entries(values).map(([key, value]) => ({
    label: localized(`GINZZZU_C7PH.Creation.Review.Identity.${key}`),
    value: displayValue(value) ?? "—"
  }));
}

function characteristicRows(actor) {
  return CHARACTERISTIC_KEYS.map((key) => {
    const raw = key === "luck"
      ? actor.system?.attribs?.lck?.value
      : actor.system?.characteristics?.[key]?.value;
    const value = nonNegativeInteger(raw);
    const ready = value !== null;
    return {
      adjustment: 0,
      adjustmentText: "0",
      extreme: ready ? Math.floor(value / 5) : "—",
      half: ready ? Math.floor(value / 2) : "—",
      key,
      label: localized(`CHARAC.${key.toUpperCase()}`),
      ready,
      value: ready ? value : "—"
    };
  });
}

function derivedRows(actor) {
  const system = actor.system ?? {};
  return DERIVED_FIELDS.map((entry) => ({
    ...entry,
    hint: localized(`GINZZZU_C7PH.Creation.Derived.Hints.${entry.key}`),
    label: localized(`GINZZZU_C7PH.Creation.Derived.Values.${entry.key}`),
    value: firstValue(system, entry.paths) ?? "—"
  }));
}

function skillSourcePresentation({cocid, isOccupation, personal, slotId}) {
  if (isOccupation) {
    return occupationSkillSourcePresentation({cocid, isOccupation, slotId});
  }
  if (personal > 0) {
    return {
      className: "is-personal",
      label: localized("GINZZZU_C7PH.Creation.Review.PersonalSkill")
    };
  }
  return {className: "", label: ""};
}

function skillRows(actor) {
  return [...(actor.items ?? [])]
    .filter((item) => item.type === "skill")
    .map((item) => {
      const adjustments = item.system?.adjustments ?? {};
      const personal = nonNegativeInteger(adjustments.personal, 0);
      const occupation = nonNegativeInteger(adjustments.occupation, 0);
      const experience = nonNegativeInteger(adjustments.experience, 0);
      const storedBase = nonNegativeInteger(adjustments.base);
      const storedTotal = nonNegativeInteger(item.system?.value);
      const base = storedBase ?? Math.max(0, (storedTotal ?? 0) - personal - occupation - experience);
      const total = storedTotal ?? (base + personal + occupation + experience);
      const moduleFlags = item.flags?.[MODULE_ID] ?? {};
      const presentation = skillSourcePresentation({
        cocid: moduleFlags.sourceCocid ?? item.flags?.CoC7?.cocidFlag?.id,
        isOccupation: Boolean(item.system?.flags?.occupation),
        personal,
        slotId: moduleFlags.slotId
      });

      return {
        base,
        experience,
        isOccupation: Boolean(item.system?.flags?.occupation),
        name: String(item.name ?? "").trim() || localized("GINZZZU_C7PH.Keeper.Review.UnknownSkill"),
        occupation,
        personal,
        sourceClass: presentation.className,
        sourceLabel: presentation.label,
        total
      };
    })
    .sort(compareSkillNames);
}

function plainText(value) {
  const source = String(value ?? "").trim();
  if (!source) return "";

  if (typeof DOMParser === "function") {
    const parsed = new DOMParser().parseFromString(source, "text/html");
    return String(parsed.body?.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  return source
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlBackstoryRows(html) {
  const source = String(html ?? "").trim();
  if (!source) return [];

  if (typeof DOMParser !== "function") {
    const value = plainText(source);
    return value ? [{
      label: localized("GINZZZU_C7PH.Keeper.Review.BackstoryLabel"),
      value
    }] : [];
  }

  const parsed = new DOMParser().parseFromString(source, "text/html");
  const rows = [];
  let label = localized("GINZZZU_C7PH.Keeper.Review.BackstoryLabel");
  let paragraphs = [];

  const flush = () => {
    const value = paragraphs.join("\n").replace(/\s+/g, " ").trim();
    if (value) rows.push({label, value});
    paragraphs = [];
  };

  for (const node of parsed.body?.children ?? []) {
    if (/^H[1-6]$/.test(node.tagName)) {
      flush();
      label = String(node.textContent ?? "").trim()
        || localized("GINZZZU_C7PH.Keeper.Review.BackstoryLabel");
      continue;
    }
    const value = String(node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (value) paragraphs.push(value);
  }
  flush();

  if (rows.length > 0) return rows;
  const value = plainText(source);
  return value ? [{
    label: localized("GINZZZU_C7PH.Keeper.Review.BackstoryLabel"),
    value
  }] : [];
}

function backstoryRows(actor) {
  const biography = Array.isArray(actor.system?.biography)
    ? actor.system.biography
    : [];
  const rows = biography.map((entry) => ({
    label: plainText(entry?.title) || localized("GINZZZU_C7PH.Keeper.Review.BackstoryLabel"),
    value: plainText(entry?.value)
  })).filter((entry) => Boolean(entry.value));

  return rows.length > 0 ? rows : htmlBackstoryRows(actor.system?.backstory);
}

function pointPool(actor, field, skills) {
  const spent = skills.reduce((total, skill) => total + nonNegativeInteger(skill[field], 0), 0);
  const storedTotal = nonNegativeInteger(actor.system?.development?.[field]);
  return {
    spent,
    total: storedTotal > 0 ? storedTotal : spent
  };
}

export function buildKeeperActorReviewContext(actor) {
  if (!actor || actor.type !== "character") return {available: false};

  const identity = identityRows(actor);
  const characteristics = characteristicRows(actor);
  const derived = derivedRows(actor);
  const skills = skillRows(actor);
  const backstory = backstoryRows(actor);
  const occupation = pointPool(actor, "occupation", skills);
  const personal = pointPool(actor, "personal", skills);
  const hasCharacteristics = characteristics.some((entry) => entry.ready);
  const hasDerived = derived.some((entry) => entry.value !== "—");
  const hasSkills = skills.length > 0;
  const hasCoreIdentity = [identity[1], identity[2], identity[5]]
    .every((entry) => entry?.value !== "—");
  const hasAllCharacteristics = characteristics.every((entry) => entry.ready);
  const hasAllDerived = derived.every((entry) => entry.value !== "—");

  return {
    available: true,
    reviewBackstory: backstory,
    reviewBackstoryEmpty: localized("GINZZZU_C7PH.Keeper.Review.ActorBackstoryEmpty"),
    reviewCharacteristics: characteristics,
    reviewCharacteristicsEmpty: localized("GINZZZU_C7PH.Keeper.Review.ActorCharacteristicsEmpty"),
    reviewDerivedEmpty: localized("GINZZZU_C7PH.Keeper.Review.ActorDerivedEmpty"),
    reviewDerivedReady: hasDerived,
    reviewDerivedValues: derived,
    reviewEyebrow: localized("GINZZZU_C7PH.Keeper.Review.ActorEyebrow"),
    reviewHasBackstory: backstory.length > 0,
    reviewHasCharacteristics: hasCharacteristics,
    reviewHasSkills: hasSkills,
    reviewIdentity: identity,
    reviewIsPartial: !hasCoreIdentity || !hasAllCharacteristics || !hasAllDerived || !hasSkills,
    reviewOccupationPointsSpent: occupation.spent,
    reviewOccupationPointsTotal: occupation.total,
    reviewPersonalPointsSpent: personal.spent,
    reviewPersonalPointsTotal: personal.total,
    reviewSkillRows: skills,
    reviewSkillsEmpty: localized("GINZZZU_C7PH.Keeper.Review.ActorSkillsEmpty"),
    reviewTitle: localized("GINZZZU_C7PH.Keeper.Review.ActorTitle")
  };
}
