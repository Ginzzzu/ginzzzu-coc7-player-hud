import { MODULE_ID } from "../../constants.js";
import { buildKeeperMonitorContext } from "../context/keeper-monitor-context.js";
import { KEEPER_MONITOR_APP_ID } from "../constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class KeeperCreationMonitor extends HandlebarsApplicationMixin(ApplicationV2) {
  _selectedUserId = null;

  static DEFAULT_OPTIONS = {
    id: KEEPER_MONITOR_APP_ID,
    tag: "section",
    classes: [MODULE_ID, "c7ph-keeper-creation-monitor"],
    position: {
      width: 1040,
      height: 720
    },
    window: {
      minimizable: true,
      resizable: true,
      title: "GINZZZU_C7PH.Keeper.Title"
    },
    actions: {
      openActor: this._openActor,
      refresh: this._refresh,
      selectPlayer: this._selectPlayer
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/keeper/creation-monitor.hbs`
    }
  };

  static async open() {
    if (!game.user?.isGM) return null;
    const existing = foundry.applications.instances.get(KEEPER_MONITOR_APP_ID);
    if (existing) {
      if (!existing.rendered) await existing.render({force: true});
      if (existing.minimized) await existing.maximize();
      existing.bringToFront?.();
      return existing;
    }

    const application = new KeeperCreationMonitor();
    await application.render({force: true});
    return application;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return buildKeeperMonitorContext(this, context);
  }

  async refresh({preserveView = true} = {}) {
    const viewState = preserveView ? this._captureViewState() : null;
    await this.render({parts: ["main"]});
    if (viewState) this._restoreViewState(viewState);
  }

  _captureViewState() {
    if (!this.rendered) return null;
    const root = this.element;
    const content = root?.querySelector(".c7ph-keeper-monitor__content");
    const tabs = root?.querySelector(".c7ph-keeper-monitor__tabs");
    const skills = root?.querySelector(".c7ph-keeper-monitor__review-skills-scroll");
    const focused = root?.contains(document.activeElement) ? document.activeElement : null;
    return {
      contentScrollTop: content?.scrollTop ?? 0,
      details: [...(root?.querySelectorAll(".c7ph-keeper-monitor__details") ?? [])].map((detail) => ({
        key: detail.classList.contains("c7ph-keeper-monitor__issues") ? "issues" : "steps",
        open: detail.open
      })),
      focus: focused instanceof HTMLElement ? {
        action: focused.dataset.action ?? null,
        userId: focused.dataset.userId ?? null
      } : null,
      position: {
        left: this.position.left,
        top: this.position.top
      },
      selectedUserId: this._selectedUserId,
      skillsScrollLeft: skills?.scrollLeft ?? 0,
      skillsScrollTop: skills?.scrollTop ?? 0,
      tabsScrollLeft: tabs?.scrollLeft ?? 0
    };
  }

  _restoreViewState(state) {
    if (!state || !this.rendered) return;
    const root = this.element;
    const left = Number(state.position?.left);
    const top = Number(state.position?.top);
    if (Number.isFinite(left) && Number.isFinite(top)) this.setPosition({left, top});

    const selectedStillExists = state.selectedUserId
      && root?.querySelector(`[data-action="selectPlayer"][data-user-id="${CSS.escape(state.selectedUserId)}"]`);
    if (selectedStillExists) this._selectedUserId = state.selectedUserId;

    for (const detailState of state.details) {
      const selector = detailState.key === "issues"
        ? ".c7ph-keeper-monitor__issues"
        : ".c7ph-keeper-monitor__steps";
      const detail = root?.querySelector(selector);
      if (detail instanceof HTMLDetailsElement) detail.open = detailState.open;
    }

    const tabs = root?.querySelector(".c7ph-keeper-monitor__tabs");
    if (tabs) tabs.scrollLeft = state.tabsScrollLeft;

    const skills = root?.querySelector(".c7ph-keeper-monitor__review-skills-scroll");
    if (skills) {
      skills.scrollLeft = state.skillsScrollLeft;
      skills.scrollTop = state.skillsScrollTop;
    }

    const content = root?.querySelector(".c7ph-keeper-monitor__content");
    if (content) content.scrollTop = state.contentScrollTop;

    if (!state.focus?.action) return;
    const userSelector = state.focus.userId
      ? `[data-user-id="${CSS.escape(state.focus.userId)}"]`
      : "";
    const target = root?.querySelector(`[data-action="${CSS.escape(state.focus.action)}"]${userSelector}`);
    if (target instanceof HTMLElement) target.focus({preventScroll: true});
  }

  static async _openActor(_event, target) {
    const user = game.users?.get(target.dataset.userId);
    const actor = user?.character;
    if (!actor) return;

    try {
      await actor.sheet.render(true);
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to open monitored investigator`, error);
      ui.notifications.error(game.i18n.localize("GINZZZU_C7PH.Keeper.Errors.OpenActor"));
    }
  }

  static async _refresh() {
    await this.refresh({preserveView: true});
  }

  static async _selectPlayer(_event, target) {
    const userId = target.dataset.userId;
    if (!userId || userId === this._selectedUserId) return;
    this._selectedUserId = userId;
    await this.refresh({preserveView: false});
  }
}
