import { MODULE_ID } from "../../constants.js";
import { CHARACTERISTIC_KEYS } from "../constants.js";
import { AgeAdjustmentService } from "./age-adjustment-service.js";
import { BackstoryService } from "./backstory-service.js";
import { CreationSourceService } from "./creation-source-service.js";
import { OccupationSkillService } from "./occupation-skill-service.js";
import { PersonalDataService } from "./personal-data-service.js";
import { PersonalInterestService } from "./personal-interest-service.js";

const OWN_LANGUAGE_COCID = "i.skill.language-own-ru";
const BACKSTORY_FIELDS = Object.freeze([
  ["description", "GINZZZU_C7PH.Creation.Backstory.Description"],
  ["ideology", "GINZZZU_C7PH.Creation.Backstory.Ideology"],
  ["significantPeople", "GINZZZU_C7PH.Creation.Backstory.SignificantPeople"],
  ["meaningfulLocations", "GINZZZU_C7PH.Creation.Backstory.MeaningfulLocations"],
  ["treasuredPossessions", "GINZZZU_C7PH.Creation.Backstory.TreasuredPossessions"],
  ["traits", "GINZZZU_C7PH.Creation.Backstory.Traits"],
  ["injuries", "GINZZZU_C7PH.Creation.Backstory.Injuries"]
]);

function integer(value, fallback = 0) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slug(value) {
  if (typeof foundry.utils.slugify === "function") {
    return foundry.utils.slugify(value, {strict: true});
  }
  return String(value ?? "skill")
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "skill";
}

function embeddedDocumentData(document) {
  const source = document.toObject();
  delete source._id;
  delete source.folder;
  delete source.ownership;
  delete source._stats;
  return source;
}

function markManaged(item, kind, identity = {}) {
  item.flags ??= {};
  item.flags[MODULE_ID] = {
    kind,
    managedByWizard: true,
    sourceCocid: identity.sourceCocid ?? null,
    slotId: identity.slotId ?? null
  };
  return item;
}

function characteristicValues(draft) {
  return Object.fromEntries(
    CHARACTERISTIC_KEYS.map((key) => [
      key,
      AgeAdjustmentService.finalValue(draft.characteristics?.[key]) ?? 0
    ])
  );
}

function biographyData(backstory) {
  const normalized = BackstoryService.normalize(backstory);
  return BACKSTORY_FIELDS
    .map(([field, labelKey]) => ({
      title: game.i18n.localize(labelKey),
      value: normalized[field]
    }))
    .filter((entry) => Boolean(entry.value));
}

function oneBlockBackstory(entries) {
  return entries.map((entry) => {
    const paragraphs = escapeHtml(entry.value)
      .split(/[\r\n]+/)
      .filter(Boolean)
      .map((paragraph) => `<p>${paragraph}</p>`)
      .join("");
    return `<h3>${escapeHtml(entry.title)}</h3>${paragraphs}`;
  }).join("<p></p>");
}

function genderLabel(gender) {
  if (!gender) return "";
  return game.i18n.localize(`GINZZZU_C7PH.Creation.PersonalData.GenderOptions.${gender}`);
}

export class InvestigatorActorDataService {
  static async build({definition, draft, user}) {
    const source = draft?.toObject?.() ?? draft ?? {};
    const personalData = PersonalDataService.normalize(source.personalData);
    const characteristics = characteristicValues(source);
    const [setupDocument, occupationDocument, skillDocuments] = await Promise.all([
      CreationSourceService.getDocument(source.setup?.uuid),
      CreationSourceService.getDocument(source.occupation?.uuid),
      Promise.all((source.skills ?? []).map((skill) => (
        CreationSourceService.getDocument(skill.uuid)
      )))
    ]);

    if (!setupDocument || !occupationDocument) {
      throw new Error(`${MODULE_ID} | Required CoC7 setup or occupation document is unavailable.`);
    }
    if (skillDocuments.some((document) => !document)) {
      throw new Error(`${MODULE_ID} | One or more CoC7 skill documents are unavailable.`);
    }

    const occupationValidation = OccupationSkillService.validate({
      definition,
      draft: source,
      process: source.occupationProcess,
      skills: source.skills
    });
    const personalValidation = PersonalInterestService.validate({
      draft: source,
      skills: source.skills
    });
    if (!occupationValidation.valid || !personalValidation.valid) {
      throw new Error(`${MODULE_ID} | Skill allocations failed final Actor validation.`);
    }

    const biography = biographyData(source.backstory);
    const useOneBlock = Boolean(game.settings.get("CoC7", "oneBlockBackstory"));
    const occupationItem = markManaged(
      embeddedDocumentData(occupationDocument),
      "occupation",
      {sourceCocid: source.occupation?.cocid ?? occupationDocument.flags?.CoC7?.cocidFlag?.id}
    );
    const skillItems = skillDocuments.map((document, index) => this.#skillData({
      document,
      skill: source.skills[index]
    }));

    const actorUpdateData = {
      name: personalData.name,
      "prototypeToken.name": personalData.name,
      system: {
        attribs: {
          lck: {value: characteristics.luck},
          san: {
            dailyLimit: Math.floor(characteristics.pow / 5),
            value: characteristics.pow
          }
        },
        backstory: useOneBlock ? oneBlockBackstory(biography) : "",
        biography: useOneBlock ? [] : biography,
        characteristics: Object.fromEntries(
          CHARACTERISTIC_KEYS
            .filter((key) => key !== "luck")
            .map((key) => [key, {value: characteristics[key]}])
        ),
        development: {
          archetype: 0,
          occupation: occupationValidation.pointState.total,
          personal: personalValidation.pointState.total
        },
        infos: {
          age: source.age,
          birthplace: personalData.birthplace,
          occupation: source.occupation?.name ?? occupationDocument.name,
          playername: user.name,
          residence: personalData.residence,
          sex: genderLabel(personalData.gender)
        },
        monetary: foundry.utils.deepClone(setupDocument.system?.monetary ?? {})
      }
    };

    return {actorUpdateData, occupationItem, skillItems};
  }

  static #skillData({document, skill}) {
    const item = embeddedDocumentData(document);
    const system = item.system ??= {};
    const adjustments = system.adjustments ??= {};
    const properties = system.properties ??= {};
    const flags = system.flags ??= {};
    const personal = integer(skill.personal);
    const occupation = integer(skill.occupation);

    adjustments.personal = personal;
    adjustments.occupation = occupation;
    adjustments.archetype = 0;
    adjustments.experiencePackage = 0;
    adjustments.experience = 0;
    adjustments.base = integer(skill.base, integer(adjustments.base));
    flags.occupation = Boolean(skill.isOccupation);

    if (skill.requiresName && skill.specialization) {
      system.skillName = skill.specialization;
      properties.requiresname = false;
      properties.picknameonly = false;
      if ((skill.sourceCocid ?? skill.cocid) === OWN_LANGUAGE_COCID) {
        properties.own = true;
      }
      item.name = skill.name;
      item.flags ??= {};
      item.flags.CoC7 ??= {};
      item.flags.CoC7.cocidFlag ??= {};
      item.flags.CoC7.cocidFlag.id = `i.skill.${slug(skill.name)}`;
    }

    return markManaged(item, "skill", {
      sourceCocid: skill.sourceCocid ?? skill.cocid,
      slotId: skill.slotId
    });
  }
}
