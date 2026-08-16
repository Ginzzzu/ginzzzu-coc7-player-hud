import { setCharacteristicPoints } from "../actions/characteristic-actions.js";

export class CharacteristicPointController {
  constructor(application) {
    this.application = application;
    this.abortController = null;
  }

  activate(root) {
    this.destroy();
    if (!root) return;

    const inputs = root.querySelectorAll("[data-characteristic-point-input]");
    if (!inputs.length) return;
    this.abortController = new AbortController();
    const options = {signal: this.abortController.signal};
    for (const input of inputs) {
      const save = () => void setCharacteristicPoints(
        this.application,
        input.dataset.characteristicKey,
        input.value
      );
      input.addEventListener("change", save, options);
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        save();
      }, options);
    }
  }

  destroy() {
    this.abortController?.abort();
    this.abortController = null;
  }
}
