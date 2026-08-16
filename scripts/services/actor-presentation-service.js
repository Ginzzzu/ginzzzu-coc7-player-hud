const STATUS_PRESENTATION = Object.freeze({
  prone: Object.freeze({
    icon: "game-icon game-icon-falling",
    label: "CoC7.Prone"
  }),
  criticalWounds: Object.freeze({
    icon: "fa-solid fa-heart-crack",
    label: "CoC7.CriticalWounds"
  }),
  dead: Object.freeze({
    icon: "fa-solid fa-skull-crossbones",
    label: "CoC7.Dead"
  }),
  dying: Object.freeze({
    icon: "fa-solid fa-skull",
    label: "CoC7.Dying"
  }),
  indefInsane: Object.freeze({
    icon: "fa-solid fa-brain",
    label: "CoC7.InsanityName"
  }),
  tempoInsane: Object.freeze({
    icon: "fa-solid fa-spider",
    label: "CoC7.BoutOfMadnessName"
  }),
  unconscious: Object.freeze({
    icon: "fa-solid fa-bed",
    label: "CoC7.Unconscious"
  })
});

export class ActorPresentationService {
  static build(resolution) {
    const actor = resolution.actor;
    if (!actor) return this.#buildEmpty(resolution.reason);

    const hp = this.#attribute(actor, "hp");
    const san = this.#attribute(actor, "san");
    const mp = this.#attribute(actor, "mp");
    const luck = this.#attribute(actor, "lck");
    const power = this.#characteristic(actor, "pow");
    const statuses = this.#statuses(actor);
    const statusIds = new Set(statuses.map((status) => status.id));

    return {
      actor: {
        img: actor.img || "icons/svg/mystery-man.svg",
        name: actor.name,
        openTitle: game.i18n.format("GINZZZU_C7PH.Actor.OpenSheet", {name: actor.name}),
        statuses
      },
      actorStateHint: "",
      actorStateTitle: "",
      hasActor: true,
      vitals: [
        this.#vital({
          id: "hp",
          label: game.i18n.localize("GINZZZU_C7PH.Vitals.HPShort"),
          max: null,
          state: this.#hpState(hp, statusIds),
          tooltip: game.i18n.localize("CoC7.HitPoints"),
          value: hp.value
        }),
        this.#vital({
          adjustAction: "adjustSanity",
          adjustMaximum: san.max,
          adjustable: true,
          decreaseTitle: game.i18n.localize("GINZZZU_C7PH.Vitals.SanityDecrease"),
          id: "san",
          increaseTitle: game.i18n.localize("GINZZZU_C7PH.Vitals.SanityIncrease"),
          label: game.i18n.localize("GINZZZU_C7PH.Vitals.SANShort"),
          max: null,
          state: statusIds.has("tempoInsane") || statusIds.has("indefInsane") ? "warning" : "",
          rollKey: "san",
          tooltip: game.i18n.localize("CoC7.Sanity"),
          value: san.value
        }),
        this.#vital({
          characteristicKey: "pow",
          id: "pow",
          label: game.i18n.localize("GINZZZU_C7PH.Vitals.POWShort"),
          max: null,
          rollAction: "rollCharacteristic",
          state: "",
          tooltip: game.i18n.localize("CHARAC.Power"),
          value: power.value
        }),
        this.#vital({
          id: "mp",
          label: game.i18n.localize("GINZZZU_C7PH.Vitals.MPShort"),
          max: null,
          state: mp.value <= 0 ? "danger" : "",
          tooltip: game.i18n.localize("CoC7.MagicPoints"),
          value: mp.value
        }),
        this.#vital({
          adjustAction: "adjustLuck",
          adjustable: true,
          decreaseTitle: game.i18n.localize("GINZZZU_C7PH.Vitals.LuckDecrease"),
          id: "luck",
          increaseTitle: game.i18n.localize("GINZZZU_C7PH.Vitals.LuckIncrease"),
          label: game.i18n.localize("GINZZZU_C7PH.Vitals.LuckShort"),
          max: null,
          state: "",
          rollKey: "lck",
          tooltip: game.i18n.localize("CoC7.Luck"),
          value: luck.value
        })
      ]
    };
  }

  static #attribute(actor, key) {
    const attribute = actor.system?.attribs?.[key] ?? {};
    return {
      max: this.#number(attribute.max),
      value: this.#number(attribute.value)
    };
  }

  static #characteristic(actor, key) {
    const characteristic = actor.system?.characteristics?.[key] ?? {};
    return {
      value: this.#number(characteristic.value)
    };
  }

  static #buildEmpty(reason) {
    const key = {
      multipleOwned: "MultipleOwned",
      noPermission: "NoPermission",
      unassigned: "Unassigned"
    }[reason] ?? "Unassigned";

    return {
      actor: null,
      actorStateHint: game.i18n.localize(`GINZZZU_C7PH.Actor.State.${key}.Hint`),
      actorStateTitle: game.i18n.localize(`GINZZZU_C7PH.Actor.State.${key}.Title`),
      hasActor: false,
      vitals: []
    };
  }

  static #hpState(hp, statusIds) {
    if (
      hp.value <= 0
      || statusIds.has("criticalWounds")
      || statusIds.has("dead")
      || statusIds.has("dying")
    ) return "danger";

    if (hp.max > 0 && hp.value <= hp.max / 2) return "warning";
    return "";
  }

  static #number(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  static #statuses(actor) {
    const active = actor.statuses instanceof Set
      ? new Set(actor.statuses)
      : new Set(actor.statuses ?? []);

    for (const id of Object.keys(STATUS_PRESENTATION)) {
      if (actor.system?.conditions?.[id]?.value) active.add(id);
    }

    return Object.entries(STATUS_PRESENTATION)
      .filter(([id]) => active.has(id))
      .map(([id, presentation]) => ({
        icon: presentation.icon,
        id,
        label: game.i18n.localize(presentation.label)
      }));
  }

  static #vital({
    adjustAction = "",
    adjustMaximum = null,
    adjustable = false,
    characteristicKey = null,
    decreaseTitle = "",
    id,
    increaseTitle = "",
    label,
    max,
    rollAction = "rollAttribute",
    rollKey = null,
    state,
    tooltip,
    value
  }) {
    const maximum = adjustMaximum > 0 ? adjustMaximum : (max > 0 ? max : 99);

    return {
      adjustAction,
      adjustable,
      canDecrease: adjustable && value > 0,
      canIncrease: adjustable && value < maximum,
      characteristicKey,
      checkable: Boolean(rollKey || characteristicKey),
      decreaseTitle,
      hasMax: Number.isFinite(max) && max > 0,
      id,
      increaseTitle,
      label,
      max,
      rollAction,
      rollKey,
      stateClass: state ? `is-${state}` : "",
      tooltip: rollKey || characteristicKey
        ? game.i18n.format("GINZZZU_C7PH.Rolls.AttributeTitle", {name: tooltip})
        : tooltip,
      value
    };
  }
}
