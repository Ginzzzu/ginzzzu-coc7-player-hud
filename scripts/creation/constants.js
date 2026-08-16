import { MODULE_ID } from "../constants.js";

export const CREATION_APP_ID = `${MODULE_ID}-investigator-wizard`;
export const CREATION_DRAFT_FLAG = "investigatorCreationDraft";
export const CREATION_DRAFT_SCHEMA_VERSION = 6;
export const CREATION_PROGRESS_DEBOUNCE_MS = 700;
export const CREATION_PROGRESS_FLAG = "investigatorCreationProgress";
export const CREATION_PROGRESS_SCHEMA_VERSION = 1;
export const CREATION_PROGRESS_STATUSES = Object.freeze({
  COMPLETED: "completed",
  IN_PROGRESS: "inProgress",
  READY: "ready"
});

export const AMYGDAL_MODULE_ID = "coc-Amygdal-chest";
export const AMYGDAL_PACKS = Object.freeze({
  OCCUPATIONS: `${AMYGDAL_MODULE_ID}.professii`,
  SKILLS: `${AMYGDAL_MODULE_ID}.navyki`,
  SETUPS: `${AMYGDAL_MODULE_ID}.sozdanie-syshika`
});

export const CREATION_CHARACTERISTIC_METHODS = Object.freeze({
  POINTS: "points",
  ROLL: "roll"
});

export const INITIAL_SETUPS = Object.freeze([
  Object.freeze({
    cocid: "i.setup.standard-1-ru",
    method: CREATION_CHARACTERISTIC_METHODS.ROLL,
    name: "Персонаж 1920-е (Бросок)"
  }),
  Object.freeze({
    cocid: "i.setup.standard-2-ru",
    method: CREATION_CHARACTERISTIC_METHODS.POINTS,
    name: "Персонаж 1920-е (Пункты)"
  })
]);

export const INITIAL_SETUP = INITIAL_SETUPS[0];

export const INITIAL_OCCUPATION_SOURCES = Object.freeze([
  "Книга Сыщика",
  "Книга Хранителя"
]);

export const CREATION_STEPS = Object.freeze({
  SETUP: "setup",
  CHARACTERISTICS: "characteristics",
  AGE: "age",
  DERIVED: "derived",
  OCCUPATION: "occupation",
  OCCUPATION_SKILLS: "occupationSkills",
  PERSONAL_INTERESTS: "personalInterests",
  PERSONAL_DATA: "personalData",
  BACKSTORY: "backstory",
  REVIEW: "review"
});

export const CREATION_STEP_ORDER = Object.freeze([
  CREATION_STEPS.SETUP,
  CREATION_STEPS.CHARACTERISTICS,
  CREATION_STEPS.AGE,
  CREATION_STEPS.DERIVED,
  CREATION_STEPS.OCCUPATION,
  CREATION_STEPS.OCCUPATION_SKILLS,
  CREATION_STEPS.PERSONAL_INTERESTS,
  CREATION_STEPS.PERSONAL_DATA,
  CREATION_STEPS.REVIEW
]);

export const CREATION_STEP_PRESENTATION = Object.freeze({
  [CREATION_STEPS.SETUP]: Object.freeze({
    icon: "fa-solid fa-box-archive",
    label: "GINZZZU_C7PH.Creation.Steps.Setup"
  }),
  [CREATION_STEPS.CHARACTERISTICS]: Object.freeze({
    icon: "fa-solid fa-dice",
    label: "GINZZZU_C7PH.Creation.Steps.Characteristics"
  }),
  [CREATION_STEPS.AGE]: Object.freeze({
    icon: "fa-solid fa-cake-candles",
    label: "GINZZZU_C7PH.Creation.Steps.Age"
  }),
  [CREATION_STEPS.DERIVED]: Object.freeze({
    icon: "fa-solid fa-calculator",
    label: "GINZZZU_C7PH.Creation.Steps.Derived"
  }),
  [CREATION_STEPS.OCCUPATION]: Object.freeze({
    icon: "fa-solid fa-briefcase",
    label: "GINZZZU_C7PH.Creation.Steps.Occupation"
  }),
  [CREATION_STEPS.OCCUPATION_SKILLS]: Object.freeze({
    icon: "fa-solid fa-list-check",
    label: "GINZZZU_C7PH.Creation.Steps.OccupationSkills"
  }),
  [CREATION_STEPS.PERSONAL_INTERESTS]: Object.freeze({
    icon: "fa-solid fa-star",
    label: "GINZZZU_C7PH.Creation.Steps.PersonalInterests"
  }),
  [CREATION_STEPS.PERSONAL_DATA]: Object.freeze({
    icon: "fa-solid fa-id-card",
    label: "GINZZZU_C7PH.Creation.Steps.PersonalData"
  }),
  [CREATION_STEPS.REVIEW]: Object.freeze({
    icon: "fa-solid fa-clipboard-check",
    label: "GINZZZU_C7PH.Creation.Steps.Review"
  })
});

export const CHARACTERISTIC_KEYS = Object.freeze([
  "str",
  "con",
  "siz",
  "dex",
  "app",
  "int",
  "pow",
  "edu",
  "luck"
]);



export const POINT_BUY_CHARACTERISTIC_KEYS = Object.freeze(
  CHARACTERISTIC_KEYS.filter((key) => key !== "luck")
);

export const POINT_BUY_CHARACTERISTIC_MAX = 90;
export const POINT_BUY_CHARACTERISTIC_MIN = 15;
export const POINT_BUY_CHARACTERISTIC_MINIMUMS = Object.freeze({
  int: 40,
  siz: 40
});

export const CHARACTERISTIC_SWAP_GROUPS = Object.freeze({
  THREE_D6: "threeD6",
  TWO_D6_PLUS_SIX: "twoD6PlusSix"
});

export const CHARACTERISTIC_SWAP_GROUP_MEMBERS = Object.freeze({
  [CHARACTERISTIC_SWAP_GROUPS.THREE_D6]: Object.freeze([
    "str",
    "con",
    "dex",
    "app",
    "pow"
  ]),
  [CHARACTERISTIC_SWAP_GROUPS.TWO_D6_PLUS_SIX]: Object.freeze([
    "siz",
    "int",
    "edu"
  ])
});
