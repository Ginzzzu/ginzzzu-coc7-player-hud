import { MODULE_ID } from "../../constants.js";
import { InvestigatorDraft } from "../models/investigator-draft.js";
import { CreationSourceService } from "./creation-source-service.js";
import { InvestigatorActorDataService } from "./investigator-actor-data-service.js";
import { InvestigatorValidationService } from "./investigator-validation-service.js";

function flagValue(source, scope, key) {
  const getterValue = source?.getFlag?.(scope, key);
  if (getterValue !== undefined) return getterValue;
  return source?.flags?.[scope]?.[key]
    ?? source?._source?.flags?.[scope]?.[key]
    ?? null;
}

function cocid(source) {
  return flagValue(source, "CoC7", "cocidFlag")?.id
    ?? source?.flags?.CoC7?.cocidFlag?.id
    ?? source?._source?.flags?.CoC7?.cocidFlag?.id
    ?? null;
}

function sourceCocid(source) {
  return flagValue(source, MODULE_ID, "sourceCocid") ?? null;
}

function slotId(source) {
  return flagValue(source, MODULE_ID, "slotId") ?? null;
}

function itemName(source) {
  return String(source?.name ?? source?._source?.name ?? "")
    .trim()
    .toLocaleLowerCase(game.i18n.lang);
}

function isManaged(item) {
  return Boolean(flagValue(item, MODULE_ID, "managedByWizard"));
}

function sameDesiredIdentity(desired, existing) {
  if (desired.type !== existing.type) return false;

  const desiredSlot = slotId(desired);
  const existingSlot = slotId(existing);
  if (desiredSlot && existingSlot && desiredSlot === existingSlot) return true;

  const desiredCocid = cocid(desired);
  const existingCocid = cocid(existing);
  if (desiredCocid && existingCocid && desiredCocid === existingCocid) return true;

  const desiredSourceCocid = sourceCocid(desired);
  const existingSourceCocid = sourceCocid(existing);
  if (desiredSourceCocid) {
    if (existingSourceCocid === desiredSourceCocid) return true;
    if (existingCocid === desiredSourceCocid) return true;
  }

  const desiredName = itemName(desired);
  return Boolean(desiredName && desiredName === itemName(existing));
}

function itemMatches(desired, existing, excludedIds) {
  const available = existing.filter((item) => !excludedIds.has(item.id));
  const matches = available.filter((item) => sameDesiredIdentity(desired, item));
  if (matches.length > 0 || desired.type !== "occupation") return matches;
  return available.filter((item) => item.type === "occupation");
}

function chooseCanonical(desired, candidates) {
  const desiredSlot = slotId(desired);
  const desiredCocid = cocid(desired);
  const desiredSourceCocid = sourceCocid(desired);

  return [...candidates].sort((left, right) => {
    const score = (item) => {
      let value = 0;
      if (desiredSlot && slotId(item) === desiredSlot) value += 100;
      if (desiredCocid && cocid(item) === desiredCocid) value += 50;
      if (desiredSourceCocid && sourceCocid(item) === desiredSourceCocid) value += 30;
      if (!isManaged(item)) value += 10;
      return value;
    };
    return score(right) - score(left);
  })[0] ?? null;
}

function mergedFlags(item, desired) {
  const existingFlags = foundry.utils.deepClone(
    item?.toObject?.().flags ?? item?.flags ?? item?._source?.flags ?? {}
  );
  return foundry.utils.mergeObject(
    existingFlags,
    foundry.utils.deepClone(desired.flags ?? {}),
    {inplace: false}
  );
}

function updateData(item, desired) {
  const update = foundry.utils.deepClone(desired);
  delete update._id;
  delete update.type;
  update.flags = mergedFlags(item, desired);
  return {_id: item.id, ...update};
}

function restoreData(item) {
  const source = item.toObject();
  delete source.folder;
  delete source.ownership;
  delete source._stats;
  return source;
}

async function createEmbeddedItems(actor, data, options = {}) {
  if (data.length === 0) return [];
  const ItemClass = CONFIG.Item?.documentClass;
  if (typeof ItemClass?.createDocuments !== "function") {
    throw new Error(`${MODULE_ID} | Foundry Item.createDocuments API is unavailable.`);
  }
  return ItemClass.createDocuments(data, {
    parent: actor,
    render: false,
    ...options
  });
}

function actorRollbackData(actor) {
  const source = actor.toObject();
  return {
    name: source.name,
    "prototypeToken.name": source.prototypeToken?.name ?? source.name,
    system: foundry.utils.deepClone(source.system ?? {})
  };
}

function assignmentError(reason) {
  const key = {
    noPermission: "AssignedActorPermission",
    unassigned: "AssignedActorMissing",
    wrongType: "AssignedActorWrongType"
  }[reason] ?? "AssignedActorMissing";
  return `GINZZZU_C7PH.Creation.Errors.${key}`;
}

export class InvestigatorCreationService {
  static availability(user = game.user) {
    const actor = user?.character ?? null;
    if (!actor) return {actor: null, available: false, reason: "unassigned"};
    if (actor.type !== "character") return {actor, available: false, reason: "wrongType"};
    if (!actor.isOwner) return {actor, available: false, reason: "noPermission"};
    return {actor, available: true, reason: null};
  }

  static async create({draft, user = game.user}) {
    const availability = this.availability(user);
    if (!availability.available) {
      return {
        errorKey: assignmentError(availability.reason),
        ok: false
      };
    }

    return this.#writeAssignedActor({
      actor: availability.actor,
      draft,
      user
    });
  }

  static async #writeAssignedActor({actor, draft, user}) {
    const source = draft instanceof InvestigatorDraft ? draft : new InvestigatorDraft(draft);
    const definition = await CreationSourceService.getOccupationDefinition(source.occupation?.uuid);
    const validation = InvestigatorValidationService.validate({definition, draft: source});
    if (!validation.valid) {
      return {errorKey: "GINZZZU_C7PH.Creation.Errors.Validation", ok: false};
    }

    const {actorUpdateData, occupationItem, skillItems} = await InvestigatorActorDataService.build({
      definition,
      draft: source,
      user
    });
    const desiredItems = [occupationItem, ...skillItems];
    const existingItems = [...actor.items];
    const reservedIds = new Set();
    const deleteIds = new Set();
    const updates = [];
    const updateSnapshots = [];
    const creates = [];

    for (const desired of desiredItems) {
      const excludedIds = new Set([...reservedIds, ...deleteIds]);
      const candidates = itemMatches(desired, existingItems, excludedIds);
      const canonical = chooseCanonical(desired, candidates);
      if (!canonical) {
        creates.push(desired);
        continue;
      }

      reservedIds.add(canonical.id);
      updates.push(updateData(canonical, desired));
      updateSnapshots.push(restoreData(canonical));

      for (const duplicate of candidates) {
        if (duplicate.id !== canonical.id) deleteIds.add(duplicate.id);
      }
    }

    for (const item of existingItems) {
      if (isManaged(item) && !reservedIds.has(item.id)) deleteIds.add(item.id);
    }

    const itemsToDelete = existingItems.filter((item) => deleteIds.has(item.id));
    const deleteSnapshots = itemsToDelete.map(restoreData);
    const rollbackActor = actorRollbackData(actor);
    let actorUpdated = false;
    let itemsUpdated = false;
    let createdIds = [];
    let itemsDeleted = false;

    try {
      actorUpdated = true;
      await actor.update(actorUpdateData);

      if (updates.length > 0) {
        itemsUpdated = true;
        await actor.updateEmbeddedDocuments("Item", updates, {render: false});
      }

      if (creates.length > 0) {
        const created = await createEmbeddedItems(actor, creates);
        createdIds = created.map((item) => item.id);
      }

      if (itemsToDelete.length > 0) {
        itemsDeleted = true;
        await actor.deleteEmbeddedDocuments(
          "Item",
          itemsToDelete.map((item) => item.id),
          {render: false}
        );
      }

      return {actor, actorId: actor.id, ok: true};
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to write investigator data to assigned Actor`, error);
      await this.#rollback({
        actor,
        actorUpdated,
        createdIds,
        deleteSnapshots,
        itemsDeleted,
        itemsUpdated,
        rollbackActor,
        updateSnapshots
      });
      throw error;
    }
  }

  static async #rollback({
    actor,
    actorUpdated,
    createdIds,
    deleteSnapshots,
    itemsDeleted,
    itemsUpdated,
    rollbackActor,
    updateSnapshots
  }) {
    if (itemsDeleted && deleteSnapshots.length > 0) {
      try {
        await createEmbeddedItems(actor, deleteSnapshots, {keepId: true});
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to restore removed Actor items`, error);
      }
    }

    if (createdIds.length > 0) {
      try {
        await actor.deleteEmbeddedDocuments("Item", createdIds, {render: false});
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to remove newly imported Actor items`, error);
      }
    }

    if (itemsUpdated && updateSnapshots.length > 0) {
      try {
        await actor.updateEmbeddedDocuments("Item", updateSnapshots, {render: false});
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to restore updated Actor items`, error);
      }
    }

    if (actorUpdated) {
      try {
        await actor.update(rollbackActor);
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to restore assigned Actor data`, error);
      }
    }
  }
}
