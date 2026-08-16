import {
  CHARACTERISTIC_SWAP_GROUP_MEMBERS,
  CHARACTERISTIC_SWAP_GROUPS
} from "../constants.js";

const GROUP_IDS = Object.freeze(Object.values(CHARACTERISTIC_SWAP_GROUPS));

export class CharacteristicSwapService {
  static get groupIds() {
    return GROUP_IDS;
  }

  static groupForKey(key) {
    return GROUP_IDS.find((groupId) => (
      CHARACTERISTIC_SWAP_GROUP_MEMBERS[groupId]?.includes(key)
    )) ?? null;
  }

  static members(groupId) {
    return CHARACTERISTIC_SWAP_GROUP_MEMBERS[groupId] ?? [];
  }

  static currentValue(entry = {}) {
    const assignedValue = Number(entry.assignedValue);
    if (entry.assignedValue !== null && entry.assignedValue !== undefined && Number.isFinite(assignedValue)) {
      return assignedValue;
    }

    const rolledValue = Number(entry.rolledValue);
    if (entry.rolledValue !== null && entry.rolledValue !== undefined && Number.isFinite(rolledValue)) {
      return rolledValue;
    }

    return null;
  }

  static groupState(swaps, groupId) {
    const source = swaps?.[groupId] ?? {};
    return {
      enabled: Boolean(source.enabled),
      sourceKey: source.sourceKey ?? null,
      targetKey: source.targetKey ?? null,
      used: Boolean(source.sourceKey && source.targetKey)
    };
  }

  static canSwap({characteristics, groupId, sourceKey, swaps, targetKey}) {
    if (!GROUP_IDS.includes(groupId) || sourceKey === targetKey) return false;
    if (this.groupForKey(sourceKey) !== groupId || this.groupForKey(targetKey) !== groupId) return false;

    const state = this.groupState(swaps, groupId);
    if (!state.enabled || state.used) return false;

    const sourceValue = this.currentValue(characteristics?.[sourceKey]);
    const targetValue = this.currentValue(characteristics?.[targetKey]);
    return Number.isFinite(sourceValue) && Number.isFinite(targetValue);
  }

  static swap({characteristics, groupId, sourceKey, swaps, targetKey}) {
    if (!this.canSwap({characteristics, groupId, sourceKey, swaps, targetKey})) {
      return null;
    }

    const nextCharacteristics = foundry.utils.deepClone(characteristics ?? {});
    const nextSwaps = foundry.utils.deepClone(swaps ?? {});
    const sourceValue = this.currentValue(nextCharacteristics[sourceKey]);
    const targetValue = this.currentValue(nextCharacteristics[targetKey]);

    nextCharacteristics[sourceKey].assignedValue = targetValue;
    nextCharacteristics[targetKey].assignedValue = sourceValue;
    nextSwaps[groupId] = {
      ...this.groupState(nextSwaps, groupId),
      sourceKey,
      targetKey
    };

    return {
      characteristics: nextCharacteristics,
      swaps: nextSwaps
    };
  }

  static toggle(swaps, groupId) {
    if (!GROUP_IDS.includes(groupId)) return null;

    const nextSwaps = foundry.utils.deepClone(swaps ?? {});
    const state = this.groupState(nextSwaps, groupId);
    if (state.used) return null;

    nextSwaps[groupId] = {
      enabled: !state.enabled,
      sourceKey: null,
      targetKey: null
    };
    return nextSwaps;
  }

  static undo({characteristics, groupId, swaps}) {
    if (!GROUP_IDS.includes(groupId)) return null;

    const state = this.groupState(swaps, groupId);
    if (!state.used) return null;

    const nextCharacteristics = foundry.utils.deepClone(characteristics ?? {});
    const nextSwaps = foundry.utils.deepClone(swaps ?? {});

    for (const key of this.members(groupId)) {
      const rolledValue = Number(nextCharacteristics[key]?.rolledValue);
      nextCharacteristics[key].assignedValue = (
        nextCharacteristics[key]?.rolledValue !== null
        && nextCharacteristics[key]?.rolledValue !== undefined
        && Number.isFinite(rolledValue)
      ) ? rolledValue : null;
    }

    nextSwaps[groupId] = {
      enabled: state.enabled,
      sourceKey: null,
      targetKey: null
    };

    return {
      characteristics: nextCharacteristics,
      swaps: nextSwaps
    };
  }

  static resetForRoll({characteristics, key, swaps}) {
    const groupId = this.groupForKey(key);
    if (!groupId) {
      return {
        characteristics: foundry.utils.deepClone(characteristics ?? {}),
        swaps: foundry.utils.deepClone(swaps ?? {})
      };
    }

    const state = this.groupState(swaps, groupId);
    if (!state.used) {
      return {
        characteristics: foundry.utils.deepClone(characteristics ?? {}),
        swaps: foundry.utils.deepClone(swaps ?? {})
      };
    }

    return this.undo({characteristics, groupId, swaps});
  }
}
