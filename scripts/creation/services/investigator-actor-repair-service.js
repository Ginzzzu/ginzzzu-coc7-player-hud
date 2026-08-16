import { MODULE_ID } from "../../constants.js";

function flagValue(source, scope, key) {
  const getterValue = source?.getFlag?.(scope, key);
  if (getterValue !== undefined) return getterValue;
  return source?.flags?.[scope]?.[key]
    ?? source?._source?.flags?.[scope]?.[key]
    ?? null;
}

function cocid(item) {
  return flagValue(item, "CoC7", "cocidFlag")?.id ?? null;
}

function isManaged(item) {
  return Boolean(flagValue(item, MODULE_ID, "managedByWizard"));
}

function duplicateIdentity(item) {
  const id = cocid(item);
  if (!id) return null;
  return `${item.type}:${id}`;
}

function repairableDuplicateIds(actor) {
  const groups = new Map();

  for (const item of actor.items ?? []) {
    if (!["occupation", "skill"].includes(item.type)) continue;
    const identity = duplicateIdentity(item);
    if (!identity) continue;
    const group = groups.get(identity) ?? [];
    group.push(item);
    groups.set(identity, group);
  }

  const deleteIds = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const managed = group.filter(isManaged);
    if (managed.length !== 1) continue;
    deleteIds.push(
      ...group.filter((item) => item.id !== managed[0].id).map((item) => item.id)
    );
  }

  return deleteIds;
}

export class InvestigatorActorRepairService {
  static async repairAssignedActor(user = game.user) {
    const actor = user?.character ?? null;
    if (!actor || actor.type !== "character" || !actor.isOwner) {
      return {actor, deleted: 0, repaired: false};
    }

    const hasManagedItems = [...(actor.items ?? [])].some(isManaged);
    if (!hasManagedItems) return {actor, deleted: 0, repaired: false};

    const deleteIds = repairableDuplicateIds(actor);
    const tokenNameMismatch = actor.prototypeToken?.name !== actor.name;
    if (deleteIds.length === 0 && !tokenNameMismatch) {
      return {actor, deleted: 0, repaired: false};
    }

    if (deleteIds.length > 0) {
      await actor.deleteEmbeddedDocuments("Item", deleteIds, {render: false});
    }

    if (tokenNameMismatch) {
      await actor.update({"prototypeToken.name": actor.name});
    }

    return {
      actor,
      deleted: deleteIds.length,
      repaired: true
    };
  }
}
