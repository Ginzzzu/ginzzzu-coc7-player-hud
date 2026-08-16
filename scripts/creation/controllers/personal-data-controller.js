import { setPersonalDataField } from "../actions/personal-data-actions.js";

export class PersonalDataController {
  constructor(application) {
    this.application = application;
    this.abortController = null;
    this.saveQueue = Promise.resolve();
  }

  activate(root) {
    this.destroy();
    if (!root) return;

    this.abortController = new AbortController();
    root.addEventListener("change", (event) => {
      const fieldElement = event.target?.closest?.("[data-personal-data-field]");
      if (!fieldElement) return;

      const field = fieldElement.dataset.personalDataField;
      const value = event.target?.value
        ?? fieldElement.value
        ?? fieldElement.getAttribute("value")
        ?? "";
      this.saveQueue = this.saveQueue.then(() => setPersonalDataField(
        this.application,
        {field, value}
      ));
    }, {signal: this.abortController.signal});
  }

  destroy() {
    this.abortController?.abort();
    this.abortController = null;
  }
}
