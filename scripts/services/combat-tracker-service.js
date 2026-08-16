const COC7_FLAG_SCOPE = "CoC7";
const GUN_READY_FLAG = "hasGun";

export class CombatTrackerError extends Error {
  constructor(i18nKey) {
    super(i18nKey);
    this.name = "CombatTrackerError";
    this.i18nKey = i18nKey;
  }
}

export class CombatTrackerService {
  static build(actor) {
    if (!actor) return this.#empty();

    const tokenResolution = this.#resolveToken(actor);
    const combat = this.#resolveCombat();
    const combatant = this.#resolveCombatant(combat, actor, tokenResolution.token);
    const inCombat = Boolean(combatant);
    const isOwner = Boolean(combatant?.isOwner ?? actor.isOwner);
    const initiative = this.#initiative(combatant?.initiative);
    const round = this.#number(combat?.round);
    const isStarted = Boolean(combat && round > 0);
    const isCurrentTurn = Boolean(
      combatant
      && this.#currentCombatantId(combat) === combatant.id
      && isStarted
    );
    const canCreateCombat = Boolean(!combat && this.#canCreateCombat());
    const canJoin = Boolean(
      !inCombat
      && tokenResolution.token
      && tokenResolution.token.isOwner
      && (combat || canCreateCombat)
    );
    const hasGunReady = Boolean(combatant?.getFlag?.(COC7_FLAG_SCOPE, GUN_READY_FLAG));

    return {
      canJoin,
      canLeave: inCombat && isOwner,
      canRollInitiative: inCombat && isOwner,
      canToggleGunReady: inCombat && isOwner,
      hasCombat: Boolean(combat),
      hasGunReady,
      inCombat,
      initiative,
      initiativeDisplay: initiative === null ? "" : this.#formatInitiative(initiative),
      initiativeMissing: initiative === null,
      isCurrentTurn,
      round,
      roundLabel: this.#roundLabel(combat, round),
      stateClass: isCurrentTurn ? "is-current-turn" : inCombat ? "is-in-combat" : "",
      statusLabel: this.#statusLabel({
        canCreateCombat,
        combat,
        inCombat,
        isCurrentTurn,
        isStarted,
        tokenResolution
      })
    };
  }

  static async join(actor) {
    this.#assertActor(actor);

    const tokenResolution = this.#resolveToken(actor);
    const token = tokenResolution.token;
    if (!token) throw new CombatTrackerError(tokenResolution.errorKey);
    if (!token.isOwner) {
      throw new CombatTrackerError("GINZZZU_C7PH.Sections.Combat.Encounter.NoPermission");
    }

    let combat = this.#resolveCombat();
    if (!combat) combat = await this.#createCombat();

    const existing = this.#resolveCombatant(combat, actor, token);
    if (existing) return existing;

    const [combatant] = await combat.createEmbeddedDocuments("Combatant", [{
      actorId: token.document?.actorId ?? actor.id,
      hidden: Boolean(token.document?.hidden),
      sceneId: canvas.scene?.id ?? null,
      tokenId: token.id
    }]);

    if (!combatant) {
      throw new CombatTrackerError("GINZZZU_C7PH.Sections.Combat.Encounter.Unavailable");
    }
    return combatant;
  }

  static async leave(actor) {
    const {combatant} = this.#operationState(actor);
    if (!combatant.isOwner) {
      throw new CombatTrackerError("GINZZZU_C7PH.Sections.Combat.Encounter.NoPermission");
    }
    await combatant.delete();
  }

  static async rollInitiative(actor) {
    const {combat, combatant} = this.#operationState(actor);
    if (!combatant.isOwner) {
      throw new CombatTrackerError("GINZZZU_C7PH.Sections.Combat.Encounter.NoPermission");
    }
    await combat.rollInitiative(combatant.id);
  }

  static async toggleGunReady(actor) {
    const {combat, combatant} = this.#operationState(actor);
    if (!combatant.isOwner) {
      throw new CombatTrackerError("GINZZZU_C7PH.Sections.Combat.Encounter.NoPermission");
    }

    const hasGunReady = !Boolean(combatant.getFlag(COC7_FLAG_SCOPE, GUN_READY_FLAG));
    await combatant.setFlag(COC7_FLAG_SCOPE, GUN_READY_FLAG, hasGunReady);

    if (typeof actor.rollInitiative !== "function") {
      await combat.rollInitiative(combatant.id);
      return;
    }

    const newInitiative = await actor.rollInitiative(hasGunReady);
    if (hasGunReady) {
      if (combatant.initiative === null || combatant.initiative < newInitiative) {
        await combat.setInitiative(combatant.id, newInitiative);
      }
      return;
    }

    await combat.setInitiative(combatant.id, newInitiative);
  }

  static #assertActor(actor) {
    if (!actor?.isOwner) {
      throw new CombatTrackerError("GINZZZU_C7PH.Sections.Combat.Encounter.NoPermission");
    }
  }

  static #canCreateCombat() {
    const combatClass = CONFIG.Combat?.documentClass;
    if (typeof combatClass?.canUserCreate === "function") {
      return combatClass.canUserCreate(game.user);
    }
    return Boolean(game.user?.isGM);
  }

  static async #createCombat() {
    if (!this.#canCreateCombat()) {
      throw new CombatTrackerError("GINZZZU_C7PH.Sections.Combat.Encounter.NoEncounter");
    }

    const combatClass = CONFIG.Combat?.documentClass;
    if (typeof combatClass?.create !== "function" || !canvas.scene?.id) {
      throw new CombatTrackerError("GINZZZU_C7PH.Sections.Combat.Encounter.Unavailable");
    }

    const combat = await combatClass.create({
      active: true,
      scene: canvas.scene.id
    });
    if (!combat) {
      throw new CombatTrackerError("GINZZZU_C7PH.Sections.Combat.Encounter.Unavailable");
    }
    return combat;
  }

  static #currentCombatantId(combat) {
    return combat?.combatant?.id
      ?? combat?.current?.combatantId
      ?? combat?.turns?.[combat?.turn]?.id
      ?? null;
  }

  static #empty() {
    return {
      canJoin: false,
      canLeave: false,
      canRollInitiative: false,
      canToggleGunReady: false,
      hasCombat: false,
      hasGunReady: false,
      inCombat: false,
      initiative: null,
      initiativeDisplay: "",
      initiativeMissing: true,
      isCurrentTurn: false,
      round: 0,
      roundLabel: game.i18n.localize("GINZZZU_C7PH.Sections.Combat.Encounter.NotStarted"),
      stateClass: "",
      statusLabel: game.i18n.localize("GINZZZU_C7PH.Sections.Combat.Encounter.NoActor")
    };
  }

  static #formatInitiative(value) {
    const optionalRule = game.settings.get("CoC7", "initiativeRule") === "optional";
    return new Intl.NumberFormat(game.i18n.lang, {
      maximumFractionDigits: optionalRule ? 2 : 0
    }).format(value);
  }

  static #initiative(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  static #number(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  static #operationState(actor) {
    this.#assertActor(actor);
    const combat = this.#resolveCombat();
    const tokenResolution = this.#resolveToken(actor);
    const combatant = this.#resolveCombatant(combat, actor, tokenResolution.token);

    if (!combat || !combatant) {
      throw new CombatTrackerError("GINZZZU_C7PH.Sections.Combat.Encounter.Unavailable");
    }
    return {combat, combatant};
  }

  static #resolveCombat() {
    const sceneId = canvas.scene?.id ?? null;
    const current = game.combat ?? null;
    if (current && this.#matchesScene(current, sceneId)) return current;

    const combats = game.combats?.contents ?? Array.from(game.combats ?? []);
    return combats.find((combat) => combat.active && this.#matchesScene(combat, sceneId)) ?? null;
  }

  static #resolveCombatant(combat, actor, token) {
    if (!combat || !actor) return null;

    if (token && typeof combat.getCombatantsByToken === "function") {
      const byToken = combat.getCombatantsByToken(token.document ?? token.id) ?? [];
      if (byToken.length) return byToken[0];
    }

    if (typeof combat.getCombatantsByActor === "function") {
      const byActor = combat.getCombatantsByActor(actor) ?? [];
      if (token) {
        const exact = byActor.find((combatant) => combatant.tokenId === token.id);
        if (exact) return exact;
      }
      if (byActor.length === 1) return byActor[0];
    }

    return combat.combatants?.find?.((combatant) => {
      if (token && combatant.tokenId === token.id) return true;
      return combatant.actor?.id === actor.id || combatant.actorId === actor.id;
    }) ?? null;
  }

  static #resolveToken(actor) {
    if (!canvas.ready || !canvas.scene || !canvas.tokens) {
      return {
        errorKey: "GINZZZU_C7PH.Sections.Combat.Encounter.NoToken",
        token: null
      };
    }

    const matches = (canvas.tokens.placeables ?? []).filter((token) => {
      const actorId = token.document?.actorId ?? token.actor?.id;
      return actorId === actor.id;
    });
    const controlled = matches.filter((token) => token.controlled);

    if (controlled.length === 1) return {errorKey: null, token: controlled[0]};
    if (controlled.length > 1 || matches.length > 1) {
      return {
        errorKey: "GINZZZU_C7PH.Sections.Combat.Encounter.SelectToken",
        token: null
      };
    }
    if (matches.length === 1) return {errorKey: null, token: matches[0]};

    return {
      errorKey: "GINZZZU_C7PH.Sections.Combat.Encounter.NoToken",
      token: null
    };
  }

  static #roundLabel(combat, round) {
    if (!combat) {
      return game.i18n.localize("GINZZZU_C7PH.Sections.Combat.Encounter.NotStarted");
    }
    if (round <= 0) {
      return game.i18n.localize("GINZZZU_C7PH.Sections.Combat.Encounter.WaitingStart");
    }
    return game.i18n.format("GINZZZU_C7PH.Sections.Combat.Encounter.Round", {round});
  }

  static #sceneId(combat) {
    return combat?.scene?.id ?? combat?.scene ?? combat?._source?.scene ?? null;
  }

  static #matchesScene(combat, sceneId) {
    const combatSceneId = this.#sceneId(combat);
    return !combatSceneId || !sceneId || combatSceneId === sceneId;
  }

  static #statusLabel({
    canCreateCombat,
    combat,
    inCombat,
    isCurrentTurn,
    isStarted,
    tokenResolution
  }) {
    if (isCurrentTurn) {
      return game.i18n.localize("GINZZZU_C7PH.Sections.Combat.Encounter.YourTurn");
    }
    if (inCombat) {
      return game.i18n.localize(
        isStarted
          ? "GINZZZU_C7PH.Sections.Combat.Encounter.WaitingTurn"
          : "GINZZZU_C7PH.Sections.Combat.Encounter.InCombat"
      );
    }
    if (!tokenResolution.token) return game.i18n.localize(tokenResolution.errorKey);
    if (!combat && !canCreateCombat) {
      return game.i18n.localize("GINZZZU_C7PH.Sections.Combat.Encounter.NoEncounter");
    }
    return game.i18n.localize("GINZZZU_C7PH.Sections.Combat.Encounter.ReadyToJoin");
  }
}
