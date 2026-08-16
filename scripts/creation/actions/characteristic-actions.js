import { prepareCharacteristicRolls, characteristicsComplete } from "../context/wizard-context.js";
import { CharacteristicPointService } from "../services/characteristic-point-service.js";
import { CharacteristicRollService } from "../services/characteristic-roll-service.js";
import { CharacteristicSwapService } from "../services/characteristic-swap-service.js";
import { DraftService } from "../services/draft-service.js";
import { AgeAdjustmentService } from "../services/age-adjustment-service.js";

export async function rollAllCharacteristics(application) {
  if (CharacteristicPointService.isPointMethod(application._draft)) return;
  const definitions = prepareCharacteristicRolls(application)
    .filter((definition) => !definition.hasValue && definition.canRoll);
  if (!definitions.length) return;

  try {
    const results = await CharacteristicRollService.rollMany(definitions);
    application._draft = await saveCharacteristicResults(application, results);
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.CharacteristicRoll", error);
  }
}

export async function rollCharacteristic(application, target) {
  const key = target.dataset.characteristicKey;
  if (CharacteristicPointService.isPointMethod(application._draft) && key !== "luck") return;
  const definition = prepareCharacteristicRolls(application)
    .find((entry) => entry.key === key);
  if (!definition?.canRoll) return;

  try {
    const result = await CharacteristicRollService.roll(definition);
    application._draft = await saveCharacteristicResults(application, [result]);
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.CharacteristicRoll", error);
  }
}

export async function modifyCharacteristicPoints(application, target, event) {
  if (!CharacteristicPointService.isPointMethod(application._draft)) return;
  const key = target.dataset.characteristicKey;
  const by = Number.parseInt(target.dataset.by, 10) || 0;
  if (!key || !by) return;
  const multiplier = event?.shiftKey ? 5 : 1;
  const source = application._draft.toObject();
  const current = CharacteristicPointService.allocationState(source).values[key];
  await savePointValue(application, key, Number(current) + (by * multiplier));
}

export async function setCharacteristicPoints(application, key, value) {
  if (!CharacteristicPointService.isPointMethod(application._draft)) return;
  await savePointValue(application, key, value, {renderUnchanged: true});
}

async function savePointValue(application, key, value, {renderUnchanged = false} = {}) {
  const source = application._draft.toObject();
  const characteristics = CharacteristicPointService.update({
    characteristics: source.characteristics,
    draft: source,
    key,
    value
  });
  if (!characteristics) {
    if (renderUnchanged) await application.render({parts: ["main"]});
    return;
  }

  try {
    const resetAge = AgeAdjustmentService.resetAfterCharacteristicChange({
      age: source.age,
      characteristics
    });
    application._draft = await DraftService.update(application._draft, {
      ageProcess: resetAge.ageProcess,
      characteristics: resetAge.characteristics
    });
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}

export async function toggleCharacteristicSwapGroup(application, target) {
  if (CharacteristicPointService.isPointMethod(application._draft)) return;
  if (!characteristicsComplete(application)) return;

  const groupId = target.dataset.swapGroup;
  const swaps = application._draft.characteristicSwaps.toObject?.()
    ?? application._draft.toObject().characteristicSwaps;
  const nextSwaps = CharacteristicSwapService.toggle(swaps, groupId);
  if (!nextSwaps) return;

  try {
    application._draft = await DraftService.update(application._draft, {
      characteristicSwaps: nextSwaps
    });
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}

export async function undoCharacteristicSwap(application, target) {
  if (CharacteristicPointService.isPointMethod(application._draft)) return;
  const groupId = target.dataset.swapGroup;
  const characteristics = application._draft.characteristics.toObject?.()
    ?? application._draft.toObject().characteristics;
  const swaps = application._draft.characteristicSwaps.toObject?.()
    ?? application._draft.toObject().characteristicSwaps;
  const result = CharacteristicSwapService.undo({characteristics, groupId, swaps});
  if (!result) return;

  try {
    const resetAge = AgeAdjustmentService.resetAfterCharacteristicChange({
      age: application._draft.age,
      characteristics: result.characteristics
    });
    application._draft = await DraftService.update(application._draft, {
      ageProcess: resetAge.ageProcess,
      characteristicSwaps: result.swaps,
      characteristics: resetAge.characteristics
    });
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}

async function saveCharacteristicResults(application, results) {
  let characteristics = application._draft.characteristics.toObject?.()
    ?? application._draft.toObject().characteristics;
  let swaps = application._draft.characteristicSwaps.toObject?.()
    ?? application._draft.toObject().characteristicSwaps;

  for (const result of results) {
    if (!characteristics[result.key] || !Number.isFinite(result.total)) continue;

    const reset = CharacteristicSwapService.resetForRoll({
      characteristics,
      key: result.key,
      swaps
    });
    characteristics = reset.characteristics;
    swaps = reset.swaps;
    characteristics[result.key].assignedValue = result.total;
    characteristics[result.key].rolledValue = result.total;
  }

  const resetAge = AgeAdjustmentService.resetAfterCharacteristicChange({
    age: application._draft.age,
    characteristics
  });

  return DraftService.update(application._draft, {
    ageProcess: resetAge.ageProcess,
    characteristicSwaps: swaps,
    characteristics: resetAge.characteristics
  });
}
