import { MODULE_ID } from "../../constants.js";
import {
  AMYGDAL_MODULE_ID,
  AMYGDAL_PACKS,
  CHARACTERISTIC_KEYS,
  CREATION_CHARACTERISTIC_METHODS,
  INITIAL_OCCUPATION_SOURCES,
  INITIAL_SETUPS,
  INITIAL_SETUP
} from "../constants.js";

const CHARACTERISTIC_LABELS = Object.freeze({
  app: "CHARAC.Appearance",
  con: "CHARAC.Constitution",
  dex: "CHARAC.Dexterity",
  edu: "CHARAC.Education",
  int: "CHARAC.Intelligence",
  luck: "CoC7.Luck",
  pow: "CHARAC.Power",
  siz: "CHARAC.Size",
  str: "CHARAC.Strength"
});

export class CreationSourceService {
  static #cache = null;
  static #occupationCache = new Map();

  static clearCache() {
    this.#cache = null;
    this.#occupationCache.clear();
  }

  static async load() {
    if (!this.#cache) this.#cache = this.#load();
    return this.#cache;
  }

  static async getDocument(uuid) {
    if (!uuid) return null;

    try {
      return await fromUuid(uuid);
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to load creation source document ${uuid}`, error);
      return null;
    }
  }

  static async getOccupationDefinition(uuid) {
    if (!uuid) return null;
    if (!this.#occupationCache.has(uuid)) {
      this.#occupationCache.set(uuid, this.#loadOccupationDefinition(uuid));
    }
    return this.#occupationCache.get(uuid);
  }

  static selectedSetup({draft, sources} = {}) {
    const source = draft?.toObject?.() ?? draft ?? {};
    const available = sources?.setups ?? [];
    return available.find((setup) => setup.uuid === source.setup?.uuid)
      ?? available.find((setup) => setup.cocid === source.setup?.cocid)
      ?? sources?.setup
      ?? null;
  }

  static async #load() {
    const module = game.modules.get(AMYGDAL_MODULE_ID);
    if (!module?.active) {
      return this.#unavailable("GINZZZU_C7PH.Creation.Source.ModuleInactive");
    }

    const setupPack = game.packs.get(AMYGDAL_PACKS.SETUPS);
    const occupationPack = game.packs.get(AMYGDAL_PACKS.OCCUPATIONS);
    const skillPack = game.packs.get(AMYGDAL_PACKS.SKILLS);
    if (!setupPack || !occupationPack || !skillPack) {
      return this.#unavailable("GINZZZU_C7PH.Creation.Source.PacksMissing");
    }

    try {
      const [setupDocuments, occupationDocuments] = await Promise.all([
        setupPack.getDocuments(),
        occupationPack.getDocuments()
      ]);

      const setupDocumentsByDefinition = INITIAL_SETUPS.map((definition) => ({
        definition,
        document: setupDocuments.find((document) => (
          document.type === "setup"
          && (
            document.name === definition.name
            || document.flags?.CoC7?.cocidFlag?.id === definition.cocid
          )
        ))
      }));
      const defaultEntry = setupDocumentsByDefinition.find(({definition}) => (
        definition.cocid === INITIAL_SETUP.cocid
      ));
      if (!defaultEntry?.document) {
        return this.#unavailable("GINZZZU_C7PH.Creation.Source.SetupMissing");
      }

      const setups = setupDocumentsByDefinition
        .filter((entry) => Boolean(entry.document))
        .map(({definition, document}) => this.#setupSummary(document, definition.method));
      const setupDocument = defaultEntry.document;

      const occupations = occupationDocuments
        .filter((document) => (
          document.type === "occupation"
          && INITIAL_OCCUPATION_SOURCES.includes(document.system?.source)
        ))
        .map((document) => this.#occupationSummary(document))
        .sort((left, right) => left.name.localeCompare(right.name, game.i18n.lang));

      const setupItems = await setupDocument.system?.items?.() ?? [];
      const skills = setupItems
        .filter((document) => document.type === "skill")
        .map((document) => this.#skillSummary(document))
        .filter((skill) => skill.cocid)
        .sort((left, right) => left.name.localeCompare(right.name, game.i18n.lang));

      return {
        available: true,
        errorKey: null,
        occupations,
        occupationSources: INITIAL_OCCUPATION_SOURCES.map((source) => ({
          count: occupations.filter((occupation) => occupation.source === source).length,
          name: source
        })),
        setup: setups.find((entry) => entry.cocid === INITIAL_SETUP.cocid) ?? setups[0],
        setups,
        skills,
        skillsByCocid: new Map(skills.map((skill) => [skill.cocid, skill]))
      };
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to read Amygdal creation compendiums`, error);
      return this.#unavailable("GINZZZU_C7PH.Creation.Source.LoadFailed");
    }
  }

  static async #loadOccupationDefinition(uuid) {
    const [sources, document] = await Promise.all([this.load(), this.getDocument(uuid)]);
    if (!sources.available || !document || document.type !== "occupation") return null;

    try {
      const [requiredDocuments, groupedDocuments] = await Promise.all([
        document.system?.items?.() ?? [],
        document.system?.skillGroups?.() ?? []
      ]);
      const requiredSkills = requiredDocuments
        .filter((item) => item.type === "skill")
        .map((item) => this.#skillSummary(item));
      const groups = (groupedDocuments ?? []).map((group, index) => ({
        index,
        options: this.#number(group?.options),
        skills: (group?.skills ?? [])
          .filter((item) => item.type === "skill")
          .map((item) => this.#skillSummary(item))
      }));
      const pointTerms = Object.entries(document.system?.occupationSkillPoints ?? {})
        .filter(([, definition]) => (
          Boolean(definition?.selected)
          && Number(definition?.multiplier) > 0
        ))
        .map(([key, definition]) => ({
          key,
          label: game.i18n.localize(CHARACTERISTIC_LABELS[key] ?? key),
          multiplier: Number(definition.multiplier),
          optional: Boolean(definition.optional)
        }));

      return {
        ...this.#occupationSummary(document),
        groups,
        personalChoiceCount: this.#number(document.system?.personal),
        pointTerms,
        requiredSkills,
        skillOptions: sources.skills
      };
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to load occupation definition ${uuid}`, error);
      return null;
    }
  }

  static #documentReference(document) {
    return {
      cocid: document.flags?.CoC7?.cocidFlag?.id ?? null,
      documentId: document.id ?? document._id ?? null,
      img: document.img || "icons/svg/item-bag.svg",
      name: document.name,
      pack: document.pack ?? document.compendium?.collection ?? null,
      source: document.system?.source ?? null,
      uuid: document.uuid ?? null
    };
  }

  static #occupationSummary(document) {
    const creditRating = document.system?.creditRating ?? {};
    const points = document.system?.occupationSkillPoints ?? {};
    const pointTerms = Object.entries(points)
      .filter(([, definition]) => Number(definition?.multiplier) > 0 && definition?.selected)
      .map(([key, definition]) => ({
        key,
        label: game.i18n.localize(CHARACTERISTIC_LABELS[key] ?? key),
        multiplier: Number(definition.multiplier),
        optional: Boolean(definition.optional)
      }));

    return {
      ...this.#documentReference(document),
      creditMax: this.#nullableNumber(creditRating.max),
      creditMin: this.#nullableNumber(creditRating.min),
      groupCount: Array.isArray(document.system?.groups) ? document.system.groups.length : 0,
      personalChoiceCount: this.#number(document.system?.personal),
      pointTerms,
      skillCount: (document.system?.itemKeys?.length ?? 0)
        + (document.system?.items?.length ?? 0)
        + (document.system?.skills?.length ?? 0),
      types: Object.entries(document.system?.type ?? {})
        .filter(([, active]) => Boolean(active))
        .map(([type]) => type)
    };
  }

  static #skillSummary(document) {
    const system = document.system ?? {};
    const properties = system.properties ?? {};
    const cocid = document.flags?.CoC7?.cocidFlag?.id ?? null;
    return {
      ...this.#documentReference(document),
      baseFormula: String(system.base ?? "0"),
      cocid,
      isCthulhuMythos: cocid === "i.skill.cthulhu-mythos",
      requiresName: Boolean(properties.requiresname),
      skillName: String(system.skillName ?? document.name ?? ""),
      specializationGroup: String(system.specialization ?? "")
    };
  }

  static #setupSummary(document, preferredMethod = null) {
    const characteristics = document.system?.characteristics ?? {};
    const points = characteristics.points ?? {};
    const rolls = characteristics.rolls ?? {};
    const reference = this.#documentReference(document);
    const characteristicMethod = preferredMethod
      ?? (points.enabled
        ? CREATION_CHARACTERISTIC_METHODS.POINTS
        : CREATION_CHARACTERISTIC_METHODS.ROLL);

    return {
      ...reference,
      bioSections: Array.isArray(document.system?.bioSections)
        ? [...document.system.bioSections]
        : [],
      characteristicFormulas: CHARACTERISTIC_KEYS.map((key) => ({
        formula: String(rolls[key] ?? ""),
        key,
        label: game.i18n.localize(CHARACTERISTIC_LABELS[key] ?? key)
      })),
      characteristicMethod,
      itemCount: (document.system?.itemKeys?.length ?? 0)
        + (document.system?.items?.length ?? 0),
      pointBudget: points.enabled ? this.#number(points.value) : 0,
      pointEnabled: Boolean(points.enabled),
      rollEnabled: Boolean(rolls.enabled)
    };
  }

  static #unavailable(errorKey) {
    return {
      available: false,
      errorKey,
      occupations: [],
      occupationSources: [],
      setup: null,
      setups: [],
      skills: [],
      skillsByCocid: new Map()
    };
  }

  static #nullableNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    return this.#number(value);
  }

  static #number(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
}
