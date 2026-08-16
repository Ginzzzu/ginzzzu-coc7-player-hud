import { MODULE_ID, SYSTEM_ID } from "../constants.js";

const DIFFICULTY_LEVELS = Object.freeze({regular: 1, hard: 2, extreme: 3});
const OPERATORS = new Set(["all", "any"]);
const MESSAGE_TIMEOUT_MS = 15000;
const ROLL_TIMEOUT_MS = 60000;
const NATIVE_HANDLER_SETTLE_MS = 250;
const DICE_SO_NICE_ID = "dice-so-nice";
const DECADER_CLASSES = new Set(["CoC7DecaderDie", "CoC7DecaderDieOther"]);
const UNIT_DIE_CLASSES = new Set(["Die", "BasicDie"]);

export class Coc7CombinedRollService {
  static async roll(actor, checks, {difficulty = "regular", operator = "all"} = {}) {
    if (game.system?.id !== SYSTEM_ID) throw new Error(`Unsupported system: ${game.system?.id ?? "unknown"}`);
    if (!actor?.uuid) throw new Error("An assigned investigator is required");
    if (!Array.isArray(checks) || checks.length < 2) throw new Error("A combined roll requires at least two checks");

    const normalizedOperator = OPERATORS.has(operator) ? operator : "all";
    const normalizedDifficulty = Object.hasOwn(DIFFICULTY_LEVELS, difficulty) ? difficulty : "regular";
    const rollRequisites = checks.map((check) => this.#buildRollRequisite(check, {
      difficulty: normalizedDifficulty
    }));
    const messageWait = this.#waitForMessage(actor.uuid, normalizedOperator, checks);
    const rollWait = this.#waitForNativeRoll(actor.uuid, normalizedOperator, checks);

    try {
      const CoC7Link = this.#getCoC7LinkClass();
      await CoC7Link._onLinkActorClick(actor, {
        check: "check",
        subtype: normalizedOperator === "any" ? "combinedany" : "combinedall",
        rolls: rollRequisites.join("&&"),
        combat: false
      });

      await messageWait.promise;
      const message = await rollWait.promise;
      await this.#integrateDiceSoNice(message, actor.uuid);
      return message;
    } catch (error) {
      messageWait.cancel();
      rollWait.cancel();
      console.error(`${MODULE_ID} | Combined CoC7 roll failed`, error);
      throw error;
    }
  }

  static #buildRollRequisite(check, {difficulty}) {
    const type = String(check?.type ?? "");
    const key = type === "skill" ? String(check?.uuid ?? "") : String(check?.key ?? "");
    if (!key || !["skill", "characteristic", "attribute"].includes(type)) {
      throw new Error("Invalid combined check descriptor");
    }

    const poolModifier = Math.max(-2, Math.min(2, Number(check?.poolModifier) || 0));
    const modifiers = [String(DIFFICULTY_LEVELS[difficulty])];
    if (poolModifier !== 0) modifiers.push(poolModifier > 0 ? `+${poolModifier}` : String(poolModifier));
    return `${type}#${key}#${modifiers.join("#")}`;
  }

  static #getCoC7LinkClass() {
    const CoC7Link = CONFIG?.CoC7Link?.documentClass;
    if (typeof CoC7Link?._onLinkActorClick !== "function") {
      throw new Error("CoC7 combined roll bridge is unavailable");
    }
    return CoC7Link;
  }

  static #waitForMessage(actorUuid, operator, checks) {
    let cleanup = () => {};
    const promise = new Promise((resolve, reject) => {
      let timer = null;
      const handler = (message) => {
        try {
          if (!this.#matchesMessage(message, actorUuid, operator, checks)) return;
          cleanup();
          resolve(message);
        } catch (error) {
          cleanup();
          console.error(`${MODULE_ID} | Failed while matching a combined CoC7 chat message`, error);
          reject(error);
        }
      };
      cleanup = () => {
        if (timer) globalThis.clearTimeout(timer);
        Hooks.off("createChatMessage", handler);
      };

      Hooks.on("createChatMessage", handler);
      timer = globalThis.setTimeout(() => {
        cleanup();
        reject(new Error("Timed out waiting for the CoC7 combined roll message"));
      }, MESSAGE_TIMEOUT_MS);
    });

    return {promise, cancel: cleanup};
  }

  static #waitForNativeRoll(actorUuid, operator, checks) {
    let cleanup = () => {};
    const promise = new Promise((resolve, reject) => {
      let clickTimer = null;
      let timeout = null;
      let clickScheduled = false;

      const renderHandler = (message, html) => {
        try {
          if (clickScheduled || !this.#matchesMessage(message, actorUuid, operator, checks)) return;
          if (this.#isMessageRolled(message, actorUuid)) {
            cleanup();
            resolve(message);
            return;
          }

          const buttons = html?.querySelectorAll?.('[data-action="rollActor"]') ?? [];
          const button = [...buttons].find((element) => element.dataset?.actorUuid === actorUuid);
          if (!button) return;

          clickScheduled = true;
          // CoC7 attaches its combined-card listeners from the same render hook
          // after an asynchronous ownership check. Defer dispatch until those
          // native listeners are present. We use a synthetic MouseEvent with a
          // stable own currentTarget property because CoC7 8.15 reads
          // event.currentTarget again after awaiting loadFromMessage(). The DOM
          // normally clears currentTarget once synchronous event dispatch ends.
          clickTimer = globalThis.setTimeout(() => {
            try {
              this.#dispatchStableClick(button);
            } catch (error) {
              cleanup();
              reject(error);
            }
          }, NATIVE_HANDLER_SETTLE_MS);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      const updateHandler = (message) => {
        try {
          if (!this.#matchesMessage(message, actorUuid, operator, checks)) return;
          if (!this.#isMessageRolled(message, actorUuid)) return;
          cleanup();
          resolve(message);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      cleanup = () => {
        if (clickTimer) globalThis.clearTimeout(clickTimer);
        if (timeout) globalThis.clearTimeout(timeout);
        Hooks.off("renderChatMessageHTML", renderHandler);
        Hooks.off("updateChatMessage", updateHandler);
      };

      Hooks.on("renderChatMessageHTML", renderHandler);
      Hooks.on("updateChatMessage", updateHandler);
      timeout = globalThis.setTimeout(() => {
        cleanup();
        reject(new Error("Timed out waiting for the native CoC7 combined roll"));
      }, ROLL_TIMEOUT_MS);
    });

    return {promise, cancel: cleanup};
  }

  static #dispatchStableClick(button) {
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: globalThis.window
    });
    Object.defineProperty(event, "currentTarget", {
      configurable: true,
      enumerable: true,
      value: button
    });
    button.dispatchEvent(event);
  }

  static async #integrateDiceSoNice(message, actorUuid) {
    if (!game.modules.get(DICE_SO_NICE_ID)?.active) return;
    if (!message?.id) return;

    // Normal CoC7 checks attach their Roll objects to the ChatMessage before it
    // is rendered. Dice So Nice then owns the standard hide -> animate ->
    // reveal lifecycle. CoC7 8.15 combined cards are different: the message is
    // created before the actor rolls and its getChatData() reducer drops the
    // dicePool.newRolls array. Repair only that missing message integration by
    // attaching an evaluated Roll reconstructed from the already-rolled native
    // dice pool. The CoC7 outcome remains untouched and no second random roll
    // is performed.
    if ((message.rolls?.length ?? 0) > 0) {
      await this.#waitForDiceSoNice(message.id);
      return;
    }

    try {
      const dicePool = this.#getDicePool(message, actorUuid);
      const roll = this.#buildVisualizationRoll(dicePool);
      if (!roll) return;

      const originalContent = String(message.content ?? "");
      const deferChat = this.#shouldDeferDiceSoNiceChat()
        && typeof game.dice3d?.waitFor3DAnimationByMessageID === "function";
      const content = deferChat
        ? `<div class="dice-roll ginzzzu-coc7-player-hud-combined-dsn-roll">${originalContent}</div>`
        : originalContent;
      const storedRolls = Array.isArray(message.toObject?.().rolls)
        ? message.toObject().rolls
        : [];

      // Updating rolls lets Dice So Nice use its own ChatMessage integration
      // instead of a separate showForRoll() call. On an update DSN hides new
      // .dice-roll content while animating; the temporary outer wrapper makes
      // the whole combined result wait, matching ordinary CoC7 checks.
      await message.update({
        content,
        rolls: [...storedRolls, roll.toJSON()]
      });

      await this.#waitForDiceSoNice(message.id);

      if (deferChat) {
        const current = game.messages?.get?.(message.id) ?? message;
        if (current?.content === content) {
          await current.update({content: originalContent});
        }
      }
    } catch (error) {
      // Dice So Nice is optional. If its message-level integration is
      // unavailable, fall back to the previous direct visualization path so a
      // native CoC7 result can never be turned into a HUD failure.
      console.warn(`${MODULE_ID} | Dice So Nice chat integration for combined roll failed`, error);
      await this.#showDiceSoNiceFallback(message, actorUuid);
    }
  }

  static #shouldDeferDiceSoNiceChat() {
    try {
      return game.settings.get(DICE_SO_NICE_ID, "immediatelyDisplayChatMessages") !== true;
    } catch (_error) {
      return true;
    }
  }

  static async #waitForDiceSoNice(messageId) {
    if (typeof game.dice3d?.waitFor3DAnimationByMessageID !== "function") return;
    try {
      await game.dice3d.waitFor3DAnimationByMessageID(messageId);
    } catch (error) {
      console.warn(`${MODULE_ID} | Unable to wait for Dice So Nice animation`, error);
    }
  }

  static async #showDiceSoNiceFallback(message, actorUuid) {
    if (typeof game.dice3d?.showForRoll !== "function") return;

    try {
      const dicePool = this.#getDicePool(message, actorUuid);
      const roll = this.#buildVisualizationRoll(dicePool);
      if (!roll) return;

      const whisper = Array.isArray(message?.whisper) && message.whisper.length > 0 ? message.whisper : null;
      await game.dice3d.showForRoll(
        roll,
        game.user,
        true,
        whisper,
        message?.blind === true,
        null,
        message?.speaker ?? null,
        {ghost: false, secret: false}
      );
    } catch (error) {
      console.warn(`${MODULE_ID} | Dice So Nice fallback visualization for combined roll failed`, error);
    }
  }

  static #getDicePool(message, actorUuid) {
    return message?.flags?.[SYSTEM_ID]?.load?.actorRolls?.[actorUuid.replace(/\./g, "/")]?.dicePool ?? null;
  }

  static #buildVisualizationRoll(dicePool) {
    const rolledDice = Array.isArray(dicePool?.rolledDice) ? dicePool.rolledDice : [];
    const result = [...rolledDice].reverse().find((entry) => entry?.rolled === true);
    if (!result) return null;

    const baseDie = this.#normalizeDecader(result.baseDie);
    const unitDie = this.#normalizeUnitDie(result.unitDie);
    const penaltyDice = Array.isArray(result.penaltyDice) ? result.penaltyDice.map((value) => this.#normalizeDecader(value)) : [];
    const bonusDice = Array.isArray(result.bonusDice) ? result.bonusDice.map((value) => this.#normalizeDecader(value)) : [];
    const formula = ["1d100"];

    if (penaltyDice.length > 0) formula.push(`+${this.#decaderTerm(penaltyDice.length, -1)}`);
    if (bonusDice.length > 0) formula.push(`+${this.#decaderTerm(bonusDice.length, 1)}`);

    const rollData = new Roll(formula.join("")).toJSON();
    const extraDecaders = [...penaltyDice, ...bonusDice];
    let extraDecaderIndex = 0;
    let percentileAssigned = false;

    for (const term of rollData.terms ?? []) {
      if (DECADER_CLASSES.has(term.class)) {
        term.evaluated = true;
        term.results = [];
        for (let index = 0; index < (Number(term.number) || 0); index++) {
          const value = extraDecaders[extraDecaderIndex++];
          if (typeof value === "undefined") throw new Error("Incomplete CoC7 decader data for Dice So Nice");
          term.results.push({result: value, active: true});
        }
        continue;
      }

      if (!UNIT_DIE_CLASSES.has(term.class)) continue;
      const faces = Number(term.faces) || 0;
      if (faces === 100 && !percentileAssigned) {
        term.evaluated = true;
        term.results = [{result: this.#basePercentileResult(baseDie, unitDie), active: true}];
        percentileAssigned = true;
      }
    }

    if (!percentileAssigned) throw new Error("Unexpected CoC7 percentile layout for Dice So Nice");
    if (extraDecaderIndex !== extraDecaders.length) throw new Error("Unexpected CoC7 decader layout for Dice So Nice");

    const currentPoolModifier = Number(dicePool?.currentPoolModifier) || 0;
    rollData.total = this.#percentileTotal({
      baseDie,
      unitDie,
      penaltyDice,
      bonusDice,
      poolModifier: currentPoolModifier,
      flatDiceModifier: Number(dicePool?.flatDiceModifier) || 0,
      luckSpent: Number(dicePool?.luckSpent) || 0
    });
    rollData.evaluated = true;
    return Roll.fromData(rollData);
  }

  static #decaderTerm(count, direction) {
    let appearance = "";
    try {
      appearance = String(game.settings.get(SYSTEM_ID, direction < 0 ? "tenDiePenalty" : "tenDieBonus") ?? "");
    } catch (_error) {
      appearance = "";
    }
    return `${count}${appearance ? `do[${appearance}]` : "dt"}`;
  }

  static #percentileTotal({baseDie, unitDie, penaltyDice, bonusDice, poolModifier, flatDiceModifier, luckSpent}) {
    const decaders = [baseDie];
    if (poolModifier < 0) decaders.push(...penaltyDice.slice(0, Math.abs(poolModifier)));
    if (poolModifier > 0) decaders.push(...bonusDice.slice(0, poolModifier));

    const unit = unitDie === 10 ? 0 : unitDie;
    const values = decaders.map((value) => {
      const decader = value === 10 ? 0 : value * 10;
      return decader === 0 && unit === 0 ? 100 : decader + unit;
    });
    const rolled = poolModifier < 0 ? Math.max(...values) : Math.min(...values);
    return Math.max(1, Math.min(100, rolled + flatDiceModifier - luckSpent));
  }

  static #basePercentileResult(baseDie, unitDie) {
    const tens = baseDie === 10 ? 0 : baseDie * 10;
    const units = unitDie === 10 ? 0 : unitDie;
    const result = tens + units;
    return result === 0 ? 100 : result;
  }

  static #normalizeDecader(value) {
    const normalized = Math.trunc(Number(value));
    if (normalized < 1 || normalized > 10) throw new Error("Invalid CoC7 decader result");
    return normalized;
  }

  static #normalizeUnitDie(value) {
    const normalized = Math.trunc(Number(value));
    if (normalized < 1 || normalized > 10) throw new Error("Invalid CoC7 unit die result");
    return normalized;
  }

  static #matchesMessage(message, actorUuid, operator, checks) {
    const load = message?.flags?.[SYSTEM_ID]?.load;
    if (load?.as !== "CoC7ChatCombinedMessage") return false;
    if (load.combinedType !== operator) return false;
    if (!Array.isArray(load.actorUuids) || !load.actorUuids.includes(actorUuid)) return false;

    const expected = checks.map((check) => ({
      key: check.type === "skill" ? check.uuid : check.key,
      poolModifier: Math.max(-2, Math.min(2, Number(check?.poolModifier) || 0)),
      type: check.type
    }));
    const actorRolls = load.actorRolls?.[actorUuid.replace(/\./g, "/")]?.rolls ?? [];
    if (actorRolls.length !== expected.length) return false;
    return expected.every((entry) => actorRolls.some((roll) =>
      roll.type === entry.type
      && roll.key === entry.key
      && (Number(roll.poolModifier) || 0) === entry.poolModifier
    ));
  }

  static #isMessageRolled(message, actorUuid) {
    const dicePool = this.#getDicePool(message, actorUuid);
    return Array.isArray(dicePool?.rolledDice) && dicePool.rolledDice.some((roll) => roll?.rolled === true);
  }
}
