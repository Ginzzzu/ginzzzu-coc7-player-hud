const MODES = {
  occupation: {
    focusSelectors: [
      "[data-occupation-personal-select]",
      "[data-occupation-specialization]",
      "[data-occupation-points]"
    ],
    markerAttributes: [
      "data-occupation-personal-select",
      "data-occupation-specialization",
      "data-occupation-points"
    ]
  },
  personal: {
    focusSelectors: [
      "[data-personal-interest-specialization]",
      "[data-personal-interest-points]"
    ],
    markerAttributes: [
      "data-personal-interest-specialization",
      "data-personal-interest-points"
    ]
  }
};

function createModeState() {
  return {
    decisionsScrollTop: 0,
    focus: null,
    tableScrollLeft: 0,
    tableScrollTop: 0
  };
}

export class AllocationViewStateController {
  constructor() {
    this.abortController = null;
    this.mode = null;
    this.state = {
      occupation: createModeState(),
      personal: createModeState()
    };
  }

  activate(root) {
    this.destroy();
    this.mode = this.#resolveMode(root);
    if (!root || !this.mode) return;

    this.abortController = new AbortController();
    const options = {signal: this.abortController.signal};
    const state = this.state[this.mode];
    const table = root.querySelector(".c7ph-allocation-table-scroll");
    const decisions = root.querySelector(".c7ph-allocation-decisions");

    if (table) {
      table.scrollLeft = state.tableScrollLeft;
      table.scrollTop = state.tableScrollTop;
      table.addEventListener("scroll", () => {
        state.tableScrollLeft = table.scrollLeft;
        state.tableScrollTop = table.scrollTop;
      }, options);
    }

    if (decisions) {
      decisions.scrollTop = state.decisionsScrollTop;
      decisions.addEventListener("scroll", () => {
        state.decisionsScrollTop = decisions.scrollTop;
      }, options);
    }

    root.addEventListener("focusin", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const descriptor = this.#describeFocus(target, this.mode);
      if (descriptor) state.focus = descriptor;
    }, options);

    document.addEventListener("focusin", (event) => {
      const target = event.target;
      if (target instanceof Node && !root.contains(target)) state.focus = null;
    }, options);

    this.#restoreFocus(root, this.mode, state.focus);
  }

  destroy() {
    this.abortController?.abort();
    this.abortController = null;
    this.mode = null;
  }

  #resolveMode(root) {
    if (!root) return null;
    if (root.querySelector(MODES.occupation.focusSelectors.join(","))) return "occupation";
    if (root.querySelector(MODES.personal.focusSelectors.join(","))) return "personal";
    return null;
  }

  #describeFocus(target, mode) {
    const config = MODES[mode];
    const marker = config.markerAttributes.find((attribute) => target.hasAttribute(attribute));
    if (!marker) return null;

    return {
      marker,
      slotId: target.dataset.slotId ?? null,
      slotIndex: target.dataset.slotIndex ?? null
    };
  }

  #restoreFocus(root, mode, descriptor) {
    if (!descriptor) return;
    const config = MODES[mode];
    if (!config.markerAttributes.includes(descriptor.marker)) return;

    let selector = `[${descriptor.marker}]`;
    if (descriptor.slotId) selector += `[data-slot-id="${CSS.escape(descriptor.slotId)}"]`;
    if (descriptor.slotIndex) selector += `[data-slot-index="${CSS.escape(descriptor.slotIndex)}"]`;

    const target = root.querySelector(selector);
    if (target instanceof HTMLElement && !target.hasAttribute("disabled")) {
      target.focus({preventScroll: true});
    }
  }
}
