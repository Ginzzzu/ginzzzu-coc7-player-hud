const SEARCH_DELAY = 140;

export class OccupationSearchController {
  constructor(application) {
    this.application = application;
    this.abortController = null;
    this.timer = null;
    this.restoreFocus = false;
  }

  activate(root) {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const options = {signal: this.abortController.signal};
    const input = root?.querySelector("[data-occupation-search]");
    const grid = root?.querySelector("[data-occupation-grid]");

    if (grid) {
      grid.scrollTop = this.application._occupationScrollTop ?? 0;
      grid.addEventListener("scroll", () => {
        this.application._occupationScrollTop = grid.scrollTop;
      }, options);
    }

    if (!input) return;
    if (this.restoreFocus) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      this.restoreFocus = false;
    }

    input.addEventListener("input", (event) => {
      this.application._occupationQuery = event.currentTarget.value;
      this.application._occupationScrollTop = grid?.scrollTop ?? 0;
      this.clear();
      this.timer = globalThis.setTimeout(() => {
        this.timer = null;
        this.restoreFocus = true;
        void this.application.render({parts: ["main"]}).catch((error) => {
          this.application._notifyError(
            "GINZZZU_C7PH.Creation.Errors.SourceLoad",
            error
          );
        });
      }, SEARCH_DELAY);
    }, options);
  }

  captureScroll(root) {
    const grid = root?.querySelector("[data-occupation-grid]");
    if (grid) this.application._occupationScrollTop = grid.scrollTop;
  }

  clear() {
    if (this.timer !== null) globalThis.clearTimeout(this.timer);
    this.timer = null;
  }

  destroy() {
    this.abortController?.abort();
    this.abortController = null;
    this.clear();
    this.restoreFocus = false;
  }
}
