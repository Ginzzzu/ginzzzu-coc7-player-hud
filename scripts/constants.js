export const MODULE_ID = "ginzzzu-coc7-player-hud";
export const MODULE_TITLE = "Ginzzzu's CoC7 Player HUD";
export const APP_ID = `${MODULE_ID}-app`;
export const SYSTEM_ID = "CoC7";

export const SETTINGS = Object.freeze({
  PREFERENCES: "preferences",
  STYLE_ROLL_DIALOGS: "styleRollDialogs",
  STYLE_PAUSE_OVERLAY: "stylePauseOverlay",
  STYLE_CHAT_MESSAGES: "styleChatMessages"
});


export const CORE_VOLUME_CONTROLS = Object.freeze([
  Object.freeze({
    icon: "fa-solid fa-music",
    key: "globalPlaylistVolume",
    label: "GINZZZU_C7PH.Sections.Volume.Music"
  }),
  Object.freeze({
    icon: "fa-solid fa-wind",
    key: "globalAmbientVolume",
    label: "GINZZZU_C7PH.Sections.Volume.Ambience"
  }),
  Object.freeze({
    icon: "fa-solid fa-bell",
    key: "globalInterfaceVolume",
    label: "GINZZZU_C7PH.Sections.Volume.Interface"
  })
]);

export const COMPACT_DISPLAY_MODE = "compact";

export const SECTIONS = Object.freeze({
  CHARACTERISTICS: "characteristics",
  SKILLS: "skills",
  REQUESTS: "requests",
  COMBAT: "combat",
  CONSEQUENCES: "consequences",
  CHAT: "chat",
  DICE: "dice",
  REFERENCE: "reference",
  VOLUME: "volume"
});

export const MAIN_SECTION_IDS = Object.freeze([
  SECTIONS.REQUESTS,
  SECTIONS.CHARACTERISTICS,
  SECTIONS.SKILLS,
  SECTIONS.COMBAT,
  SECTIONS.CONSEQUENCES
]);

export const SKILL_VIEWS = Object.freeze({
  ALL: "all",
  OCCUPATION: "occupation",
  FAVORITES: "favorites",
  RECENT: "recent"
});

export const SECTION_PRESENTATION = Object.freeze({
  [SECTIONS.CHARACTERISTICS]: Object.freeze({
    icon: "fa-solid fa-chart-simple",
    label: "GINZZZU_C7PH.Sections.Characteristics.Label",
    message: "GINZZZU_C7PH.Sections.Characteristics.Placeholder",
    requiresActor: true
  }),
  [SECTIONS.SKILLS]: Object.freeze({
    icon: "fa-solid fa-book-open",
    label: "GINZZZU_C7PH.Sections.Skills.Label",
    message: "GINZZZU_C7PH.Sections.Skills.Placeholder",
    requiresActor: true
  }),
  [SECTIONS.REQUESTS]: Object.freeze({
    icon: "fa-solid fa-hand",
    label: "GINZZZU_C7PH.Sections.Requests.Label",
    message: "GINZZZU_C7PH.Sections.Requests.Placeholder",
    requiresActor: true
  }),
  [SECTIONS.COMBAT]: Object.freeze({
    icon: "fa-solid fa-crosshairs",
    label: "GINZZZU_C7PH.Sections.Combat.Label",
    message: "GINZZZU_C7PH.Sections.Combat.Placeholder",
    requiresActor: true
  }),
  [SECTIONS.CONSEQUENCES]: Object.freeze({
    icon: "fa-solid fa-bolt",
    label: "GINZZZU_C7PH.Sections.Consequences.Label",
    message: "GINZZZU_C7PH.Sections.Consequences.Empty",
    requiresActor: true
  }),
  [SECTIONS.CHAT]: Object.freeze({
    icon: "fa-solid fa-message",
    label: "GINZZZU_C7PH.Sections.Chat.Label",
    message: "GINZZZU_C7PH.Sections.Chat.Empty",
    requiresActor: false
  }),
  [SECTIONS.DICE]: Object.freeze({
    icon: "fa-solid fa-dice-d20",
    label: "GINZZZU_C7PH.Sections.Dice.Label",
    message: "GINZZZU_C7PH.Sections.Dice.Placeholder",
    requiresActor: false
  }),
  [SECTIONS.REFERENCE]: Object.freeze({
    icon: "fa-solid fa-circle-question",
    label: "GINZZZU_C7PH.Sections.Reference.Label",
    message: "GINZZZU_C7PH.Sections.Reference.Placeholder",
    requiresActor: false
  }),
  [SECTIONS.VOLUME]: Object.freeze({
    icon: "fa-solid fa-volume-high",
    label: "GINZZZU_C7PH.Sections.Volume.Label",
    message: "GINZZZU_C7PH.Sections.Volume.Placeholder",
    requiresActor: false
  })
});

export const BODY_CLASSES = Object.freeze({
  ACTIVE: `${MODULE_ID}-active`,
  CORE_VISIBLE: `${MODULE_ID}-core-visible`,
  HIDE_CAMERAS: `${MODULE_ID}-hide-cameras`,
  STYLE_ROLL_DIALOGS: `${MODULE_ID}-style-roll-dialogs`,
  STYLE_PAUSE_OVERLAY: `${MODULE_ID}-style-pause-overlay`,
  STYLE_CHAT_MESSAGES: `${MODULE_ID}-style-chat-messages`,
  PAUSE_OVERLAY: `${MODULE_ID}-pause-overlay`,
  PAUSE_OVERLAY_ACTIVE: `${MODULE_ID}-pause-overlay-active`
});

export const PREFERENCES_SCHEMA_VERSION = 3;
