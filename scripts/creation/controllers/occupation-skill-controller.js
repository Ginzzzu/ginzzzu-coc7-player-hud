import {
  setOccupationPersonalSkill,
  setOccupationPoints,
  setOccupationSpecialization
} from "../actions/occupation-skill-actions.js";

export class OccupationSkillController {
  constructor(application) {
    this.application = application;
    this.abortController = null;
  }

  activate(root) {
    this.destroy();
    if (!root) return;

    this.abortController = new AbortController();
    const options = {signal: this.abortController.signal};

    for (const select of root.querySelectorAll("[data-occupation-personal-select]")) {
      select.addEventListener("change", () => void setOccupationPersonalSkill(
        this.application,
        {
          cocid: select.value,
          slotIndex: Number(select.dataset.slotIndex)
        }
      ), options);
    }

    for (const input of root.querySelectorAll("[data-occupation-specialization]")) {
      input.addEventListener("change", () => void setOccupationSpecialization(
        this.application,
        {slotId: input.dataset.slotId, value: input.value}
      ), options);
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        void setOccupationSpecialization(
          this.application,
          {slotId: input.dataset.slotId, value: input.value}
        );
      }, options);
    }

    for (const input of root.querySelectorAll("[data-occupation-points]")) {
      input.addEventListener("change", () => void setOccupationPoints(
        this.application,
        {slotId: input.dataset.slotId, value: input.value}
      ), options);
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        void setOccupationPoints(
          this.application,
          {slotId: input.dataset.slotId, value: input.value}
        );
      }, options);
    }
  }

  destroy() {
    this.abortController?.abort();
    this.abortController = null;
  }
}
