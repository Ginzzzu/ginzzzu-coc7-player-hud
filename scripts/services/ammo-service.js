import { MODULE_ID } from "../constants.js";

const RANGED_CARD_TYPE = "CoC7ChatCombatRanged";
const PENDING_TTL_MS = 120_000;
const pendingByWeapon = new Map();
const trackedMessages = new Map();
let hooksRegistered = false;

function getRangedCardData(message) {
  const data = message?.flags?.CoC7?.load;
  return data?.as === RANGED_CARD_TYPE ? data : null;
}

function asAmmo(value) {
  const parsed = Number.parseInt(value ?? 0, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function clearExpiredPending() {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [weaponUuid, pending] of pendingByWeapon) {
    if (pending.startedAt < cutoff) pendingByWeapon.delete(weaponUuid);
  }
}

async function synchronizeTrackedMessage(messageId) {
  const tracked = trackedMessages.get(messageId);
  if (!tracked || AmmoService.disregardsAmmo) return;

  const message = game.messages.get(messageId);
  const data = getRangedCardData(message);
  if (!data) return;

  const totalBulletsFired = asAmmo(data.totalBulletsFired);
  if (totalBulletsFired <= tracked.lastTotalBulletsFired) return;

  const weapon = await fromUuid(tracked.weaponUuid);
  if (!weapon || weapon.type !== "weapon") {
    trackedMessages.delete(messageId);
    return;
  }

  const expectedAmmo = Math.max(0, tracked.initialAmmo - totalBulletsFired);
  const actualAmmo = asAmmo(weapon.system?.ammo);

  // CoC7 normally updates ammunition itself. Repair only a missing update so
  // native consumption can never be applied twice.
  if (actualAmmo > expectedAmmo) {
    await weapon.update({"system.ammo": expectedAmmo});
  }

  tracked.lastTotalBulletsFired = totalBulletsFired;
}

export class AmmoService {
  static get disregardsAmmo() {
    try {
      return Boolean(game.settings.get("CoC7", "disregardAmmo"));
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to read CoC7 disregardAmmo`, error);
      return false;
    }
  }

  static hasTracker(weapon) {
    return Boolean(
      weapon?.type === "weapon"
      && weapon.system?.properties?.rngd
      && weapon.system?.bullets !== null
      && weapon.system?.bullets !== undefined
    );
  }

  static current(weapon) {
    return asAmmo(weapon?.system?.ammo);
  }

  static capacity(weapon) {
    if (!this.hasTracker(weapon)) return null;
    return asAmmo(weapon?.system?.bullets);
  }

  static canAttack(weapon) {
    return !this.hasTracker(weapon) || this.disregardsAmmo || this.current(weapon) > 0;
  }

  static trackRangedWeaponUse(weapon) {
    if (!this.hasTracker(weapon) || this.disregardsAmmo) return;

    clearExpiredPending();
    pendingByWeapon.set(weapon.uuid, {
      initialAmmo: this.current(weapon),
      startedAt: Date.now()
    });
  }

  static async updateCurrent(actor, weaponId, rawValue) {
    if (!actor?.isOwner) throw new Error("An owned investigator is required");
    const weapon = actor.items?.get(weaponId);
    if (!weapon || !this.hasTracker(weapon)) throw new Error(`Tracked weapon not found: ${weaponId}`);

    const value = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ammunition value: ${rawValue}`);
    if (value === this.current(weapon)) return weapon;

    await weapon.update({"system.ammo": value});
    return weapon;
  }

  static registerHooks() {
    if (hooksRegistered) return;
    hooksRegistered = true;

    Hooks.on("createChatMessage", async (message) => {
      try {
        const data = getRangedCardData(message);
        if (!data?.itemUuid) return;

        clearExpiredPending();
        const pending = pendingByWeapon.get(data.itemUuid);
        if (!pending) return;

        pendingByWeapon.delete(data.itemUuid);
        trackedMessages.set(message.id, {
          weaponUuid: data.itemUuid,
          initialAmmo: pending.initialAmmo,
          lastTotalBulletsFired: 0
        });
        await synchronizeTrackedMessage(message.id);
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to synchronize ammunition for a new CoC7 combat card`, error);
      }
    });

    Hooks.on("updateChatMessage", async (message) => {
      try {
        if (trackedMessages.has(message.id)) await synchronizeTrackedMessage(message.id);
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to synchronize ammunition after a CoC7 attack`, error);
      }
    });

    Hooks.on("deleteChatMessage", (message) => {
      trackedMessages.delete(message.id);
    });
  }
}
