import { setBackstoryField } from "../actions/backstory-actions.js";

export class BackstoryController {
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
      const fieldElement = event.target?.closest?.("[data-backstory-field]");
      if (!fieldElement) return;

      const field = fieldElement.dataset.backstoryField;
      const value = fieldElement.value ?? "";
      this.saveQueue = this.saveQueue.then(() => setBackstoryField(
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
