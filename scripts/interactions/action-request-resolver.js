import { ACTION_REQUEST_CATALOG, ACTION_REQUEST_CATEGORIES, getActionRequestDefinition } from "./action-request-catalog.js";

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase(game.i18n.lang)
    .replace(/[():,_\-–—/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function skillCocid(skill) {
  return String(skill?.flags?.CoC7?.cocidFlag?.id ?? "").trim();
}

function skillNameParts(skill) {
  return [skill?.name, skill?.system?.skillName]
    .filter(Boolean)
    .map(normalize);
}

function specializationNameParts(skill) {
  return [skill?.name, skill?.system?.skillName, skill?.system?.specialization]
    .filter(Boolean)
    .map(normalize);
}

function matchesCocid(skill, resolution) {
  const cocid = skillCocid(skill);
  if (!cocid) return false;
  return resolution.cocids?.includes(cocid) ?? false;
}

function matchesCocidPrefix(skill, resolution) {
  const cocid = skillCocid(skill);
  if (!cocid || resolution.excludeCocids?.includes(cocid)) return false;
  return resolution.cocidPrefixes?.some((prefix) => cocid.startsWith(prefix)) ?? false;
}

function matchesTerm(skill, terms, {prefix = false} = {}) {
  const normalizedTerms = terms.map(normalize);
  return skillNameParts(skill).some((name) => normalizedTerms.some((term) => (
    prefix ? name === term || name.startsWith(`${term} `) : name === term
  )));
}

function matchesSpecializationTerm(skill, terms) {
  const normalizedTerms = terms.map(normalize);
  return specializationNameParts(skill).some((name) => normalizedTerms.some((term) => (
    name === term || name.startsWith(`${term} `)
  )));
}

function displayName(skill) {
  return skill?.system?.properties?.special && skill?.system?.skillName
    ? skill.system.skillName
    : skill?.name ?? "";
}

function skillPresentation(skill) {
  return {
    id: skill.id,
    name: displayName(skill),
    uuid: skill.uuid,
    value: number(skill.system?.value)
  };
}

function localizedCategories(availableCategoryIds, activeCategory) {
  return [
    {
      id: "all",
      icon: "fa-solid fa-layer-group",
      label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Categories.All")
    },
    ...ACTION_REQUEST_CATEGORIES
      .filter((entry) => availableCategoryIds.has(entry.id))
      .map((entry) => ({...entry, label: game.i18n.localize(entry.label)}))
  ].map((entry) => ({...entry, active: entry.id === activeCategory}));
}

export class ActionRequestResolver {
  static build(actor, {query = "", category = "all", includeAllAvailable = false} = {}) {
    const resolved = ACTION_REQUEST_CATALOG
      .map((definition) => this.resolve(actor, definition))
      .filter((entry) => entry?.available);
    const availableCategoryIds = new Set(resolved.map((entry) => entry.category));
    const activeCategory = category === "all" || availableCategoryIds.has(category) ? category : "all";
    const normalizedQuery = normalize(query);
    const entries = includeAllAvailable
      ? resolved
      : resolved
        .filter((entry) => activeCategory === "all" || entry.category === activeCategory)
        .filter((entry) => !normalizedQuery || normalize(`${entry.label} ${entry.detail} ${entry.searchText}`).includes(normalizedQuery));

    return {
      categories: localizedCategories(availableCategoryIds, activeCategory),
      entries,
      hasEntries: entries.length > 0,
      activeCategory
    };
  }

  static resolve(actor, definitionOrId) {
    const definition = typeof definitionOrId === "string"
      ? getActionRequestDefinition(definitionOrId)
      : definitionOrId;
    if (!definition) return null;

    const label = game.i18n.localize(definition.label);
    const base = {
      id: definition.id,
      category: definition.category,
      label,
      searchText: label,
      available: false,
      detail: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Unavailable"),
      valueLabel: "—",
      resolution: definition.resolution
    };
    if (!actor) return base;

    if (definition.resolution.type === "characteristic") {
      const key = definition.resolution.key;
      const value = number(actor.system?.characteristics?.[key]?.value);
      const localized = game.i18n.localize({
        str: "CHARAC.Strength",
        con: "CHARAC.Constitution",
        dex: "CHARAC.Dexterity",
        int: "CHARAC.Intelligence",
        edu: "CHARAC.Education",
        app: "CHARAC.Appearance",
        pow: "CHARAC.Power"
      }[key] ?? key);
      return {
        ...base,
        available: value > 0,
        detail: localized,
        valueLabel: `${value}%`,
        searchText: `${label} ${localized}`,
        resolved: {type: "characteristic", key, value}
      };
    }

    if (definition.resolution.type === "attribute") {
      const key = definition.resolution.key;
      const value = number(actor.system?.attribs?.[key]?.value);
      const detail = key === "lck"
        ? game.i18n.localize("CoC7.Luck")
        : key.toUpperCase();
      return {
        ...base,
        available: value > 0,
        detail,
        valueLabel: `${value}%`,
        searchText: `${label} ${detail}`,
        resolved: {type: "attribute", key, value}
      };
    }

    const skills = [...actor.items].filter((item) => item.type === "skill");
    if (definition.resolution.type === "specialization") {
      const cocidMatches = skills.filter((skill) => matchesCocidPrefix(skill, definition.resolution));
      const matches = cocidMatches.length
        ? cocidMatches
        : skills.filter((skill) => matchesSpecializationTerm(skill, definition.resolution.terms));
      const choices = matches
        .map(skillPresentation)
        .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
      if (!choices.length) return base;
      if (choices.length === 1) {
        const [choice] = choices;
        return {
          ...base,
          available: true,
          detail: choice.name,
          valueLabel: `${choice.value}%`,
          choices,
          needsChoice: false,
          searchText: `${label} ${choice.name}`,
          resolved: {type: "skill", itemId: choice.id, value: choice.value}
        };
      }
      return {
        ...base,
        available: true,
        detail: game.i18n.format("GINZZZU_C7PH.Sections.Requests.Specializations", {count: choices.length}),
        valueLabel: "",
        choices,
        needsChoice: true,
        searchText: `${label} ${choices.map((choice) => choice.name).join(" ")}`,
        resolved: {type: "specialization"}
      };
    }

    const cocidSkill = skills.find((item) => matchesCocid(item, definition.resolution));
    const skill = cocidSkill ?? skills.find((item) => matchesTerm(item, definition.resolution.terms, definition.resolution));
    if (!skill) return base;
    const presentation = skillPresentation(skill);
    return {
      ...base,
      available: true,
      detail: presentation.name,
      valueLabel: `${presentation.value}%`,
      searchText: `${label} ${presentation.name}`,
      resolved: {type: "skill", itemId: presentation.id, value: presentation.value}
    };
  }
}
