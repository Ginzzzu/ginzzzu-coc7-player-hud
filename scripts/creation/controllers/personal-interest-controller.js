import {
  setPersonalInterestPoints,
  setPersonalInterestSpecialization
} from "../actions/personal-interest-actions.js";

export class PersonalInterestController {
  constructor(application) {
    this.application = application;
    this.abortController = null;
  }

  activate(root) {
    this.destroy();
    if (!root) return;

    this.abortController = new AbortController();
    const options = {signal: this.abortController.signal};

    for (const input of root.querySelectorAll("[data-personal-interest-points]")) {
      const save = () => void setPersonalInterestPoints(this.application, {
        slotId: input.dataset.slotId,
        value: input.value
      });
      input.addEventListener("change", save, options);
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        save();
      }, options);
    }

    for (const input of root.querySelectorAll("[data-personal-interest-specialization]")) {
      const save = () => void setPersonalInterestSpecialization(this.application, {
        slotId: input.dataset.slotId,
        value: input.value
      });
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
