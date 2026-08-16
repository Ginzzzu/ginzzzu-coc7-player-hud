import { MODULE_ID } from "../../constants.js";
import {
  CREATION_PROGRESS_DEBOUNCE_MS,
  CREATION_PROGRESS_FLAG
} from "../constants.js";
import { CreationProgressSnapshot } from "../models/creation-progress-snapshot.js";
import { CreationProgressStateService } from "./creation-progress-state-service.js";

export class CreationProgressService {
  static #pending = null;
  static #timer = null;

  static load(actor, {userId = null} = {}) {
    const stored = actor?.getFlag?.(MODULE_ID, CREATION_PROGRESS_FLAG);
    if (!stored) return null;

    try {
      const snapshot = new CreationProgressSnapshot(stored);
      if (snapshot.actorId !== actor.id) return null;
      if (userId && snapshot.userId !== userId) return null;
      return snapshot;
    } catch (error) {
      console.error(`${MODULE_ID} | Invalid investigator creation progress snapshot`, error);
      return null;
    }
  }

  static schedule(draft, {user = game.user} = {}) {
    const actor = this.#assignedActor(user);
    if (!actor) return;

    this.#pending = {
      draft: draft?.toObject?.() ?? foundry.utils.deepClone(draft ?? {}),
      user
    };
    if (this.#timer !== null) globalThis.clearTimeout(this.#timer);
    this.#timer = globalThis.setTimeout(() => {
      this.#timer = null;
      const pending = this.#pending;
      this.#pending = null;
      if (!pending) return;
      void this.publish(pending.draft, {user: pending.user}).catch((error) => {
        console.error(`${MODULE_ID} | Failed to publish investigator creation progress`, error);
      });
    }, CREATION_PROGRESS_DEBOUNCE_MS);
  }

  static async flush(draft = null, {user = game.user} = {}) {
    if (this.#timer !== null) {
      globalThis.clearTimeout(this.#timer);
      this.#timer = null;
    }

    const pending = this.#pending;
    this.#pending = null;
    const source = draft ?? pending?.draft;
    const targetUser = pending?.user ?? user;
    if (!source) return null;
    return this.publish(source, {user: targetUser});
  }

  static async publish(draft, {completed = false, user = game.user} = {}) {
    const actor = this.#assignedActor(user);
    if (!actor) return null;

    const previous = this.load(actor, {userId: user.id})?.toObject?.() ?? null;
    const data = await CreationProgressStateService.build({
      actor,
      completed,
      draft,
      previous,
      user
    });
    const snapshot = new CreationProgressSnapshot(data);

    try {
      await actor.setFlag(MODULE_ID, CREATION_PROGRESS_FLAG, snapshot.toObject());
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to save investigator creation progress`, error);
      throw error;
    }

    return snapshot;
  }

  static async markCompleted(draft, {user = game.user} = {}) {
    this.cancelPending();
    return this.publish(draft, {completed: true, user});
  }

  static async clear({user = game.user} = {}) {
    this.cancelPending();
    const actor = this.#assignedActor(user);
    if (!actor) return;

    try {
      await actor.unsetFlag(MODULE_ID, CREATION_PROGRESS_FLAG);
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to clear investigator creation progress`, error);
      throw error;
    }
  }

  static cancelPending() {
    if (this.#timer !== null) globalThis.clearTimeout(this.#timer);
    this.#timer = null;
    this.#pending = null;
  }

  static #assignedActor(user) {
    if (user?.isGM) return null;
    const actor = user?.character ?? null;
    if (!actor || actor.type !== "character" || !actor.isOwner) return null;
    return actor;
  }
}
