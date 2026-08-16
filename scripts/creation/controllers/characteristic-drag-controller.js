import { characteristicsComplete } from "../context/wizard-context.js";
import { CharacteristicSwapService } from "../services/characteristic-swap-service.js";
import { DraftService } from "../services/draft-service.js";
import { AgeAdjustmentService } from "../services/age-adjustment-service.js";

export class CharacteristicDragController {
  constructor(application) {
    this.application = application;
    this.draggedKey = null;
  }

  activate(root) {
    const cards = root?.querySelectorAll("[data-characteristic-card]") ?? [];
    for (const card of cards) this.#bindCard(root, card);
  }

  destroy(root) {
    this.draggedKey = null;
    this.#clear(root);
  }

  #bindCard(root, card) {
    card.addEventListener("dragstart", (event) => {
      if (card.dataset.characteristicDraggable !== "true") {
        event.preventDefault();
        return;
      }

      const key = card.dataset.characteristicKey;
      this.draggedKey = key;
      this.#showTargets(root, key);
      event.dataTransfer?.setData("text/plain", key);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });

    card.addEventListener("dragenter", () => {
      if (this.#canDrop(this.draggedKey, card.dataset.characteristicKey)) {
        card.classList.add("is-swap-target-hover");
      }
    });

    card.addEventListener("dragover", (event) => {
      if (!this.#canDrop(this.draggedKey, card.dataset.characteristicKey)) return;
      event.preventDefault();
      card.classList.add("is-swap-target-hover");
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });

    card.addEventListener("dragleave", (event) => {
      if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
      card.classList.remove("is-swap-target-hover");
    });

    card.addEventListener("drop", (event) => {
      const sourceKey = this.draggedKey
        ?? event.dataTransfer?.getData("text/plain");
      const targetKey = card.dataset.characteristicKey;
      if (!this.#canDrop(sourceKey, targetKey)) return;

      event.preventDefault();
      this.draggedKey = null;
      this.#clear(root);
      void this.#swap(sourceKey, targetKey);
    });

    card.addEventListener("dragend", () => {
      this.draggedKey = null;
      this.#clear(root);
    });
  }

  #showTargets(root, sourceKey) {
    const cards = root?.querySelectorAll("[data-characteristic-card]") ?? [];
    for (const card of cards) {
      const targetKey = card.dataset.characteristicKey;
      const isSource = targetKey === sourceKey;
      const isAvailable = !isSource && this.#canDrop(sourceKey, targetKey);

      card.classList.toggle("is-drag-source", isSource);
      card.classList.toggle("is-swap-target-available", isAvailable);
      card.classList.toggle("is-swap-target-unavailable", !isSource && !isAvailable);
      card.classList.remove("is-swap-target-hover");
    }
  }

  #clear(root) {
    const cards = root?.querySelectorAll("[data-characteristic-card]") ?? [];
    for (const card of cards) {
      card.classList.remove(
        "is-drag-source",
        "is-swap-target-available",
        "is-swap-target-hover",
        "is-swap-target-unavailable"
      );
    }
  }

  #canDrop(sourceKey, targetKey) {
    const application = this.application;
    if (!sourceKey || !targetKey || !characteristicsComplete(application)) return false;

    const groupId = CharacteristicSwapService.groupForKey(sourceKey);
    if (!groupId || CharacteristicSwapService.groupForKey(targetKey) !== groupId) {
      return false;
    }

    const characteristics = application._draft.characteristics.toObject?.()
      ?? application._draft.toObject().characteristics;
    const swaps = application._draft.characteristicSwaps.toObject?.()
      ?? application._draft.toObject().characteristicSwaps;

    return CharacteristicSwapService.canSwap({
      characteristics,
      groupId,
      sourceKey,
      swaps,
      targetKey
    });
  }

  async #swap(sourceKey, targetKey) {
    const application = this.application;
    const groupId = CharacteristicSwapService.groupForKey(sourceKey);
    const characteristics = application._draft.characteristics.toObject?.()
      ?? application._draft.toObject().characteristics;
    const swaps = application._draft.characteristicSwaps.toObject?.()
      ?? application._draft.toObject().characteristicSwaps;
    const result = CharacteristicSwapService.swap({
      characteristics,
      groupId,
      sourceKey,
      swaps,
      targetKey
    });
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
}
