import { setAge } from "../actions/age-actions.js";

export class AgeInputController {
  constructor(application) {
    this.application = application;
    this.abortController = null;
  }

  activate(root) {
    this.destroy();
    const input = root?.querySelector("[data-age-input]");
    if (!input) return;

    this.abortController = new AbortController();
    const options = {signal: this.abortController.signal};
    input.addEventListener("change", () => void setAge(this.application, input.value), options);
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void setAge(this.application, input.value);
    }, options);
  }

  destroy() {
    this.abortController?.abort();
    this.abortController = null;
  }
}
