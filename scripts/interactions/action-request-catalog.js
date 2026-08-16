export const ACTION_REQUEST_CATEGORIES = Object.freeze([
  Object.freeze({id: "investigation", icon: "fa-solid fa-magnifying-glass", label: "GINZZZU_C7PH.Sections.Requests.Categories.Investigation"}),
  Object.freeze({id: "social", icon: "fa-solid fa-comments", label: "GINZZZU_C7PH.Sections.Requests.Categories.Social"}),
  Object.freeze({id: "physical", icon: "fa-solid fa-person-running", label: "GINZZZU_C7PH.Sections.Requests.Categories.Physical"}),
  Object.freeze({id: "technical", icon: "fa-solid fa-screwdriver-wrench", label: "GINZZZU_C7PH.Sections.Requests.Categories.Technical"}),
  Object.freeze({id: "medicine", icon: "fa-solid fa-kit-medical", label: "GINZZZU_C7PH.Sections.Requests.Categories.Medicine"}),
  Object.freeze({id: "knowledge", icon: "fa-solid fa-book", label: "GINZZZU_C7PH.Sections.Requests.Categories.Knowledge"})
]);

const skill = (id, category, label, cocid, terms, options = {}) => Object.freeze({
  id,
  category,
  label,
  resolution: Object.freeze({
    type: "skill",
    cocids: Object.freeze([cocid]),
    terms: Object.freeze(terms),
    ...options
  })
});

const specialization = (id, category, label, cocidPrefixes, terms, options = {}) => Object.freeze({
  id,
  category,
  label,
  resolution: Object.freeze({
    type: "specialization",
    cocidPrefixes: Object.freeze(cocidPrefixes),
    terms: Object.freeze(terms),
    excludeCocids: Object.freeze(options.excludeCocids ?? []),
    ...options
  })
});

const characteristic = (id, category, label, key) => Object.freeze({
  id,
  category,
  label,
  resolution: Object.freeze({type: "characteristic", key})
});

export const ACTION_REQUEST_CATALOG = Object.freeze([
  skill("inspect-area", "investigation", "GINZZZU_C7PH.Sections.Requests.Actions.InspectArea", "i.skill.spot-hidden", ["внимание", "наблюдательность", "spot hidden"]),
  skill("listen", "investigation", "GINZZZU_C7PH.Sections.Requests.Actions.Listen", "i.skill.listen", ["слух", "listen"]),
  skill("track", "investigation", "GINZZZU_C7PH.Sections.Requests.Actions.Track", "i.skill.track", ["чтение следов", "выслеживание", "track"]),
  skill("library-search", "investigation", "GINZZZU_C7PH.Sections.Requests.Actions.LibrarySearch", "i.skill.library-use", ["работа в библиотеке", "библиотека", "library use"]),
  skill("appraise", "investigation", "GINZZZU_C7PH.Sections.Requests.Actions.Appraise", "i.skill.appraise", ["оценка", "appraise"]),
  skill("accounting", "investigation", "GINZZZU_C7PH.Sections.Requests.Actions.Accounting", "i.skill.accounting", ["бухгалтерское дело", "бухгалтерия", "accounting"]),
  skill("archaeology", "investigation", "GINZZZU_C7PH.Sections.Requests.Actions.Archaeology", "i.skill.archaeology", ["археология", "archaeology"]),
  skill("anthropology", "investigation", "GINZZZU_C7PH.Sections.Requests.Actions.Anthropology", "i.skill.anthropology", ["антропология", "anthropology"]),
  skill("history", "investigation", "GINZZZU_C7PH.Sections.Requests.Actions.History", "i.skill.history", ["история", "history"]),
  skill("law", "investigation", "GINZZZU_C7PH.Sections.Requests.Actions.Law", "i.skill.law", ["юриспруденция", "право", "law"]),

  skill("charm", "social", "GINZZZU_C7PH.Sections.Requests.Actions.Charm", "i.skill.charm", ["обаяние", "charm"]),
  skill("fast-talk", "social", "GINZZZU_C7PH.Sections.Requests.Actions.FastTalk", "i.skill.fast-talk", ["красноречие", "быстрый разговор", "fast talk"]),
  skill("persuade", "social", "GINZZZU_C7PH.Sections.Requests.Actions.Persuade", "i.skill.persuade", ["убеждение", "persuade"]),
  skill("intimidate", "social", "GINZZZU_C7PH.Sections.Requests.Actions.Intimidate", "i.skill.intimidate", ["запугивание", "intimidate"]),
  skill("psychology", "social", "GINZZZU_C7PH.Sections.Requests.Actions.Psychology", "i.skill.psychology", ["психология", "psychology"]),
  skill("credit-rating", "social", "GINZZZU_C7PH.Sections.Requests.Actions.CreditRating", "i.skill.credit-rating", ["средства", "кредитный рейтинг", "credit rating"]),
  skill("disguise", "social", "GINZZZU_C7PH.Sections.Requests.Actions.Disguise", "i.skill.disguise", ["маскировка", "disguise"]),

  skill("stealth", "physical", "GINZZZU_C7PH.Sections.Requests.Actions.Stealth", "i.skill.stealth", ["скрытность", "stealth"]),
  skill("sleight-of-hand", "physical", "GINZZZU_C7PH.Sections.Requests.Actions.SleightOfHand", "i.skill.sleight-of-hand", ["ловкость рук", "sleight of hand"]),
  skill("climb", "physical", "GINZZZU_C7PH.Sections.Requests.Actions.Climb", "i.skill.climb", ["лазанье", "лазание", "climb"]),
  skill("jump", "physical", "GINZZZU_C7PH.Sections.Requests.Actions.Jump", "i.skill.jump", ["прыжки", "прыжок", "jump"]),
  skill("swim", "physical", "GINZZZU_C7PH.Sections.Requests.Actions.Swim", "i.skill.swim", ["плавание", "swim"]),
  skill("ride", "physical", "GINZZZU_C7PH.Sections.Requests.Actions.Ride", "i.skill.ride", ["верховая езда", "ride"]),
  skill("throw", "physical", "GINZZZU_C7PH.Sections.Requests.Actions.Throw", "i.skill.throw", ["метание", "throw"]),

  skill("drive", "technical", "GINZZZU_C7PH.Sections.Requests.Actions.Drive", "i.skill.drive-auto", ["вождение автомобиля", "вождение", "drive auto", "drive automobile"], {prefix: true}),
  specialization("pilot", "technical", "GINZZZU_C7PH.Sections.Requests.Actions.Pilot", ["i.skill.pilot-"], ["пилотирование", "pilot"], {excludeCocids: ["i.skill.pilot-any"]}),
  skill("heavy-machinery", "technical", "GINZZZU_C7PH.Sections.Requests.Actions.HeavyMachinery", "i.skill.operate-heavy-machinery", ["управление тяжёлой техникой", "управление тяжелой техникой", "operate heavy machinery"]),
  skill("navigate", "technical", "GINZZZU_C7PH.Sections.Requests.Actions.Navigate", "i.skill.navigate", ["ориентирование", "навигация", "navigate"]),
  skill("locksmith", "technical", "GINZZZU_C7PH.Sections.Requests.Actions.Locksmith", "i.skill.locksmith", ["взлом", "слесарное дело", "locksmith"]),
  skill("mechanical-repair", "technical", "GINZZZU_C7PH.Sections.Requests.Actions.MechanicalRepair", "i.skill.mechanical-repair", ["механика", "mechanical repair"]),
  skill("electrical-repair", "technical", "GINZZZU_C7PH.Sections.Requests.Actions.ElectricalRepair", "i.skill.electrical-repair", ["электрика", "electrical repair"]),

  skill("first-aid", "medicine", "GINZZZU_C7PH.Sections.Requests.Actions.FirstAid", "i.skill.first-aid", ["первая помощь", "first aid"]),
  skill("medicine", "medicine", "GINZZZU_C7PH.Sections.Requests.Actions.Medicine", "i.skill.medicine", ["медицина", "medicine"]),
  skill("psychoanalysis", "medicine", "GINZZZU_C7PH.Sections.Requests.Actions.Psychoanalysis", "i.skill.psychoanalysis", ["психоанализ", "psychoanalysis"]),

  skill("natural-world", "knowledge", "GINZZZU_C7PH.Sections.Requests.Actions.NaturalWorld", "i.skill.natural-world", ["естествознание", "natural world"]),
  specialization("science", "knowledge", "GINZZZU_C7PH.Sections.Requests.Actions.Science", ["i.skill.science-"], ["наука", "science"], {excludeCocids: ["i.skill.science-any"]}),
  skill("occult", "knowledge", "GINZZZU_C7PH.Sections.Requests.Actions.Occult", "i.skill.occult", ["оккультизм", "occult"]),
  skill("cthulhu-mythos", "knowledge", "GINZZZU_C7PH.Sections.Requests.Actions.CthulhuMythos", "i.skill.cthulhu-mythos", ["мифы ктулху", "cthulhu mythos"]),
  skill("own-language", "knowledge", "GINZZZU_C7PH.Sections.Requests.Actions.OwnLanguage", "i.skill.language-own", ["родной язык", "язык родной", "язык own", "own language", "language own"], {prefix: true}),
  specialization("other-language", "knowledge", "GINZZZU_C7PH.Sections.Requests.Actions.OtherLanguage", ["i.skill.language-"], ["иностранный язык", "язык иностранный", "language", "other language"], {excludeCocids: ["i.skill.language-any", "i.skill.language-own"]}),
  specialization("survival", "knowledge", "GINZZZU_C7PH.Sections.Requests.Actions.Survival", ["i.skill.survival-"], ["выживание", "survival"], {excludeCocids: ["i.skill.survival-any"]}),
  specialization("art-craft", "knowledge", "GINZZZU_C7PH.Sections.Requests.Actions.ArtCraft", ["i.skill.art-craft-"], ["искусство/ремесло", "искусство ремесло", "искусство и ремесло", "art/craft", "art craft"], {excludeCocids: ["i.skill.art-craft-any"]}),

  characteristic("force", "physical", "GINZZZU_C7PH.Sections.Requests.Actions.Force", "str"),
  characteristic("endure", "physical", "GINZZZU_C7PH.Sections.Requests.Actions.Endure", "con"),
  characteristic("react", "physical", "GINZZZU_C7PH.Sections.Requests.Actions.React", "dex"),
  characteristic("idea", "investigation", "GINZZZU_C7PH.Sections.Requests.Actions.Idea", "int"),
  characteristic("general-knowledge", "investigation", "GINZZZU_C7PH.Sections.Requests.Actions.GeneralKnowledge", "edu"),
  characteristic("appearance", "social", "GINZZZU_C7PH.Sections.Requests.Actions.Appearance", "app")
]);

export function getActionRequestDefinition(actionId) {
  return ACTION_REQUEST_CATALOG.find((entry) => entry.id === actionId) ?? null;
}
