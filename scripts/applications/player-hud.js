import {
  APP_ID,
  MAIN_SECTION_IDS,
  MODULE_ID,
  SECTIONS,
  SECTION_PRESENTATION,
  SKILL_VIEWS
} from "../constants.js";
import { ActorPresentationService } from "../services/actor-presentation-service.js";
import { AmmoService } from "../services/ammo-service.js";
import { ActorResolverService } from "../services/actor-resolver-service.js";
import { CharacteristicsService } from "../services/characteristics-service.js";
import { Coc7RollService } from "../services/coc7-roll-service.js";
import { CombatService } from "../services/combat-service.js";
import { CombatTrackerError, CombatTrackerService } from "../services/combat-tracker-service.js";
import { ChatPreviewService } from "../services/chat-preview-service.js";
import { ConditionsService } from "../services/conditions-service.js";
import { ConsequencesService } from "../services/consequences-service.js";
import { GenericDiceRollService } from "../services/generic-dice-roll-service.js";
import { LuckService } from "../services/luck-service.js";
import { SanityService } from "../services/sanity-service.js";
import { PreferencesService } from "../services/preferences-service.js";
import { requestSmallTimeCompatibility } from "../services/smalltime-compatibility-service.js";
import { SkillsService } from "../services/skills-service.js";
import { UiVisibilityService } from "../services/ui-visibility-service.js";
import { VolumeService } from "../services/volume-service.js";
import { WeaponDamageService } from "../services/weapon-damage-service.js";
import { InvestigatorWizard } from "../creation/applications/investigator-wizard.js";
import { CreationAccessService } from "../creation/services/creation-access-service.js";
import { ActionRequestService } from "../interactions/action-request-service.js";
import { Coc7InteractionProvider } from "../interactions/coc7-interaction-provider.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HOVER_OPEN_DELAY = 100;
const HOVER_CLOSE_DELAY = 220;
const SKILL_SEARCH_DELAY = 120;
const COMBINED_MODIFIER_OPTIONS = Object.freeze([
  {value: 2, label: "GINZZZU_C7PH.Sections.Requests.Modifiers.TwoBonus"},
  {value: 1, label: "GINZZZU_C7PH.Sections.Requests.Modifiers.OneBonus"},
  {value: 0, label: "GINZZZU_C7PH.Sections.Requests.Modifiers.None"},
  {value: -1, label: "GINZZZU_C7PH.Sections.Requests.Modifiers.OnePenalty"},
  {value: -2, label: "GINZZZU_C7PH.Sections.Requests.Modifiers.TwoPenalty"}
]);

function combinedModifierOptions(poolModifier = 0) {
  const current = Math.max(-2, Math.min(2, Number(poolModifier) || 0));
  return COMBINED_MODIFIER_OPTIONS.map((entry) => ({
    label: game.i18n.localize(entry.label),
    selected: entry.value === current,
    value: entry.value
  }));
}

const SHELF_SCROLL_SELECTORS = Object.freeze([
  ".c7ph-chat-list",
  ".c7ph-incoming-request-list",
  ".c7ph-request-grid",
  ".c7ph-reference",
  ".c7ph-combat-scroll",
  ".c7ph-skill-list",
  ".c7ph-consequence-scroll"
]);

export class PlayerHud extends HandlebarsApplicationMixin(ApplicationV2) {
  _activeSection = null;
  _hoverCleanup = null;
  _hoverCloseTimer = null;
  _hoverOpenTimer = null;
  _hoverRenderInProgress = false;
  _pinnedSection = null;
  _restoreSkillSearch = false;
  _requestCategory = "all";
  _requestCombinedActorUuid = null;
  _requestCombinedOperator = "all";
  _requestCombinedSelections = new Map();
  _requestMode = "single";
  _requestQuery = "";
  _sectionInitialized = false;
  _skillQuery = "";
  _skillSearchTimer = null;
  _skillView = SKILL_VIEWS.ALL;
  _suppressShelfAnimation = false;

  static DEFAULT_OPTIONS = {
    id: APP_ID,
    tag: "section",
    classes: [MODULE_ID],
    window: {
      frame: false,
      positioned: false
    },
    actions: {
      adjustLuck: this._adjustLuck,
      adjustSanity: this._adjustSanity,
      clearRecentSkills: this._clearRecentSkills,
      joinCombat: this._joinCombat,
      leaveCombat: this._leaveCombat,
      openActorSheet: this._openActorSheet,
      openChatSidebar: this._openChatSidebar,
      openInvestigatorWizard: this._openInvestigatorWizard,
      rollAttribute: this._rollAttribute,
      rollCharacteristic: this._rollCharacteristic,
      rollDeathCheck: this._rollDeathCheck,
      rollGenericDie: this._rollGenericDie,
      rollInitiative: this._rollInitiative,
      rollActionRequest: this._rollActionRequest,
      rollCombinedRequest: this._rollCombinedRequest,
      rollIncomingRequest: this._rollIncomingRequest,
      clearCombinedRequest: this._clearCombinedRequest,
      dismissIncomingRequest: this._dismissIncomingRequest,
      setCombinedOperator: this._setCombinedOperator,
      setRequestCategory: this._setRequestCategory,
      setRequestMode: this._setRequestMode,
      toggleCombinedCharacteristic: this._toggleCombinedCharacteristic,
      toggleCombinedRequest: this._toggleCombinedRequest,
      rollSkill: this._rollSkill,
      rollWeapon: this._rollWeapon,
      rollWeaponDamage: this._rollWeaponDamage,
      setSkillView: this._setSkillView,
      toggleCondition: this._toggleCondition,
      toggleCoreInterface: this._toggleCoreInterface,
      toggleGunReady: this._toggleGunReady,
      toggleFavoriteSkill: this._toggleFavoriteSkill,
      toggleSection: this._toggleSection,
      toggleVolumeMute: this._toggleVolumeMute
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/player-hud.hbs`
    }
  };

  get actor() {
    return ActorResolverService.resolve().actor;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const preferences = PreferencesService.get();
    const actorResolution = ActorResolverService.resolve();
    const actorPresentation = ActorPresentationService.build(actorResolution);
    const creationAccess = CreationAccessService.resolve();
    const characteristics = CharacteristicsService.build(actorResolution.actor);
    const chatPreview = ChatPreviewService.build();
    const combat = CombatService.build(actorResolution.actor);
    const conditions = ConditionsService.build(actorResolution.actor);
    const consequences = ConsequencesService.build(actorResolution.actor);
    const diceButtons = GenericDiceRollService.build();
    const volumeControls = VolumeService.build();
    const requestContext = ActionRequestService.build(actorResolution.actor, {
      category: this._requestCategory,
      includeAllAvailable: true
    });
    this._requestCategory = requestContext.activeCategory;
    const actorUuid = actorResolution.actor?.uuid ?? null;
    if (this._requestCombinedActorUuid !== actorUuid) {
      this._requestCombinedSelections.clear();
      this._requestCombinedActorUuid = actorUuid;
    } else if (this._requestCombinedSelections.size) {
      const refreshedSelections = ActionRequestService.normalizeChecks(
        actorResolution.actor,
        [...this._requestCombinedSelections.values()]
      );
      this._requestCombinedSelections = new Map(
        refreshedSelections.map((check) => [check.identity, check])
      );
    }
    const selectedCombinedIds = new Set(this._requestCombinedSelections.keys());
    const requestEntries = requestContext.entries.map((entry) => {
      const choices = entry.choices?.map((choice) => ({
        ...choice,
        combinedSelected: selectedCombinedIds.has(`skill:${choice.id}`)
      })) ?? [];
      const check = entry.needsChoice
        ? null
        : ActionRequestService.describeCheck(actorResolution.actor, entry.id);
      return {
        ...entry,
        choices,
        combinedSelected: Boolean(check && selectedCombinedIds.has(check.identity))
      };
    });
    const combinedCharacteristics = characteristics.map((entry) => ({
      ...entry,
      combinedSelected: selectedCombinedIds.has(`characteristic:${entry.key}`)
    }));
    const combinedSelections = [...this._requestCombinedSelections.values()].map((check) => ({
      ...check,
      modifierOptions: combinedModifierOptions(check.poolModifier)
    }));
    const incomingRequests = Coc7InteractionProvider.getIncomingRequests();
    const skillContext = SkillsService.build(actorResolution.actor, {
      favoriteSkillUuids: preferences.favoriteSkillUuids,
      query: this._skillQuery,
      recentSkillUuids: preferences.recentSkillUuids,
      view: this._skillView
    });

    if (!this._sectionInitialized) {
      this._activeSection = this._supportsHover ? null : preferences.activeSection;
      this._sectionInitialized = true;
    }

    if (this._activeSection) {
      const presentation = SECTION_PRESENTATION[this._activeSection];
      const actorUnavailable = presentation?.requiresActor && !actorPresentation.hasActor;
      if (actorUnavailable) {
        this._activeSection = null;
        this._pinnedSection = null;
      }
    }

    const activePresentation = this._activeSection
      ? SECTION_PRESENTATION[this._activeSection]
      : null;

    return {
      ...context,
      ...actorPresentation,
      ...chatPreview,
      ...combat,
      ...conditions,
      ...consequences,
      characteristics,
      diceButtons,
      skills: skillContext.skills,
      activeSection: this._activeSection,
      coreInterfaceVisible: UiVisibilityService.coreInterfaceVisible,
      hasActiveSection: Boolean(activePresentation),
      hasSkills: skillContext.hasAny,
      hasVisibleSkills: skillContext.hasVisible,
      createInvestigatorIcon: creationAccess.resumable ? "fa-user-pen" : "fa-user-plus",
      createInvestigatorTitle: game.i18n.localize(
        creationAccess.resumable
          ? "GINZZZU_C7PH.Creation.Actions.Continue"
          : "GINZZZU_C7PH.Creation.Actions.Start"
      ),
      navigation: MAIN_SECTION_IDS.map((id) => {
        const presentation = SECTION_PRESENTATION[id];
        const isConsequences = id === SECTIONS.CONSEQUENCES;
        const label = game.i18n.localize(presentation.label);
        const conditionTitle = isConsequences && conditions.activeConditionTooltip
          ? [label, conditions.activeConditionTooltip].join("\n")
          : label;

        return {
          active: this._activeSection === id,
          clickOnly: Boolean(presentation.clickOnly),
          conditionCompactIndicators: isConsequences
            ? conditions.activeConditionCompactIndicators
            : [],
          conditionCompactOverflow: isConsequences
            ? conditions.activeConditionCompactOverflow
            : 0,
          conditionIndicators: isConsequences ? conditions.activeConditionIndicators : [],
          conditionOverflow: isConsequences ? conditions.activeConditionOverflow : 0,
          count: isConsequences && consequences.hasConsequences
            ? consequences.consequenceCount
            : id === SECTIONS.REQUESTS && incomingRequests.length
              ? incomingRequests.length
              : null,
          disabled: Boolean(presentation.requiresActor && !actorPresentation.hasActor),
          hasActiveConditions: isConsequences && conditions.hasActiveConditions,
          icon: presentation.icon,
          id,
          label,
          requestAttention: id === SECTIONS.REQUESTS && incomingRequests.length > 0,
          title: conditionTitle
        };
      }),
      sectionIcon: activePresentation?.icon ?? "",
      sectionMessage: activePresentation
        ? game.i18n.localize(activePresentation.message)
        : "",
      sectionTitle: activePresentation
        ? game.i18n.localize(activePresentation.label)
        : "",
      chatNavigation: {
        active: this._activeSection === SECTIONS.CHAT,
        icon: SECTION_PRESENTATION[SECTIONS.CHAT].icon,
        id: SECTIONS.CHAT,
        label: game.i18n.localize(SECTION_PRESENTATION[SECTIONS.CHAT].label)
      },
      diceNavigation: {
        active: this._activeSection === SECTIONS.DICE,
        icon: SECTION_PRESENTATION[SECTIONS.DICE].icon,
        id: SECTIONS.DICE,
        label: game.i18n.localize(SECTION_PRESENTATION[SECTIONS.DICE].label)
      },
      referenceNavigation: {
        active: this._activeSection === SECTIONS.REFERENCE,
        icon: SECTION_PRESENTATION[SECTIONS.REFERENCE].icon,
        id: SECTIONS.REFERENCE,
        label: game.i18n.localize(SECTION_PRESENTATION[SECTIONS.REFERENCE].label)
      },
      showCharacteristics: this._activeSection === SECTIONS.CHARACTERISTICS,
      showInvestigatorWizardAction: creationAccess.showAction,
      showChat: this._activeSection === SECTIONS.CHAT,
      showCombat: this._activeSection === SECTIONS.COMBAT,
      showConsequences: this._activeSection === SECTIONS.CONSEQUENCES,
      showDice: this._activeSection === SECTIONS.DICE,
      showReference: this._activeSection === SECTIONS.REFERENCE,
      showRequests: this._activeSection === SECTIONS.REQUESTS,
      requestCategories: requestContext.categories,
      requestEntries,
      requestQuery: this._requestQuery,
      hasRequestEntries: requestContext.hasEntries,
      combinedCharacteristics,
      combinedOperatorAll: this._requestCombinedOperator === "all",
      combinedOperatorAny: this._requestCombinedOperator === "any",
      combinedSelections,
      combinedSelectionCount: combinedSelections.length,
      combinedCanRoll: combinedSelections.length >= 2,
      requestModeCombined: this._requestMode === "combined",
      requestModeSingle: this._requestMode === "single",
      incomingRequests,
      hasIncomingRequests: incomingRequests.length > 0,
      showSkills: this._activeSection === SECTIONS.SKILLS,
      showClearRecentSkills: this._skillView === SKILL_VIEWS.RECENT && skillContext.recentCount > 0,
      showVolume: this._activeSection === SECTIONS.VOLUME,
      suppressShelfAnimation: this._suppressShelfAnimation,
      skillQuery: this._skillQuery,
      volumeControls,
      volumeNavigation: {
        active: this._activeSection === SECTIONS.VOLUME,
        icon: SECTION_PRESENTATION[SECTIONS.VOLUME].icon,
        id: SECTIONS.VOLUME,
        label: game.i18n.localize(SECTION_PRESENTATION[SECTIONS.VOLUME].label)
      },
      skillViews: [
        {
          active: this._skillView === SKILL_VIEWS.ALL,
          count: skillContext.totalCount,
          id: SKILL_VIEWS.ALL,
          label: game.i18n.localize("GINZZZU_C7PH.Sections.Skills.All")
        },
        {
          active: this._skillView === SKILL_VIEWS.OCCUPATION,
          count: skillContext.occupationCount,
          id: SKILL_VIEWS.OCCUPATION,
          label: game.i18n.localize("GINZZZU_C7PH.Sections.Skills.Occupation")
        },
        {
          active: this._skillView === SKILL_VIEWS.FAVORITES,
          count: skillContext.favoriteCount,
          id: SKILL_VIEWS.FAVORITES,
          label: game.i18n.localize("GINZZZU_C7PH.Sections.Skills.Favorites")
        },
        {
          active: this._skillView === SKILL_VIEWS.RECENT,
          count: skillContext.recentCount,
          id: SKILL_VIEWS.RECENT,
          label: game.i18n.localize("GINZZZU_C7PH.Sections.Skills.Recent")
        }
      ]
    };
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    const preferences = PreferencesService.get();
    if (preferences.autoHideInterface) {
      UiVisibilityService.activate({
        collapseSidebar: true,
        hideCameras: preferences.hideCameras,
        resetCoreInterface: true
      });
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const preferences = PreferencesService.get();
    if (preferences.autoHideInterface) {
      UiVisibilityService.activate({hideCameras: preferences.hideCameras});
      requestSmallTimeCompatibility();
    } else {
      UiVisibilityService.deactivate();
    }

    const root = this.element;
    this._activateShelfHover(root);
    this._activateCombatControls(root);
    this._activateSkillSearch(root);
    this._activateRequestSearch(root);
    this._activateRequestCombinedModifiers(root);
    this._activateVolumeControls(root);
    this._scrollChatToLatest(root);
    if (this._activeSection === SECTIONS.REQUESTS) {
      void Coc7InteractionProvider.markIncomingOpened().catch((error) => {
        console.error(`${MODULE_ID} | Failed to acknowledge opened requests`, error);
      });
    }
    this._suppressShelfAnimation = false;

  }

  async _onClose(options) {
    this._stopHoverMode();
    this._clearSkillSearchTimer();
    UiVisibilityService.deactivate();
    return super._onClose(options);
  }

  static async _clearRecentSkills() {
    try {
      await PreferencesService.clearRecentSkills();
      await this._renderMain();
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Preference", error);
    }
  }

  static async _joinCombat() {
    try {
      this._suppressShelfAnimation = true;
      await CombatTrackerService.join(this.actor);
    } catch (error) {
      this._notifyCombatError(error);
    }
  }

  static async _leaveCombat() {
    try {
      this._suppressShelfAnimation = true;
      await CombatTrackerService.leave(this.actor);
    } catch (error) {
      this._notifyCombatError(error);
    }
  }

  static async _openChatSidebar() {
    try {
      this._activeSection = null;
      this._pinnedSection = null;
      UiVisibilityService.showCoreInterface();

      if (!ui.sidebar?.expanded && typeof ui.sidebar?.expand === "function") {
        await ui.sidebar.expand();
      }

      if (typeof ui.chat?.activate === "function") {
        ui.chat.activate();
      } else if (typeof ui.sidebar?.changeTab === "function") {
        ui.sidebar.changeTab("chat", "primary", {force: true});
      }

      await this._renderMain();
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Interface", error);
    }
  }

  static async _openInvestigatorWizard() {
    try {
      await InvestigatorWizard.open();
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Creation.Errors.Open", error);
    }
  }

  static async _openActorSheet() {
    const actor = this.actor;
    if (!actor?.sheet) return;

    try {
      await actor.sheet.render(true);
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.ActorSheet", error);
    }
  }

  static async _adjustLuck(event, target) {
    const direction = Number(target.dataset.direction);

    try {
      await LuckService.adjust(this.actor, direction, {largeStep: event.shiftKey});
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.ActorUpdate", error);
    }
  }

  static async _adjustSanity(event, target) {
    const direction = Number(target.dataset.direction);

    try {
      await SanityService.adjust(this.actor, direction, {largeStep: event.shiftKey});
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.SanityActorUpdate", error);
    }
  }

  static async _rollAttribute(event, target) {
    const key = target.dataset.attribute;

    try {
      await this._closeShelfForRoll();
      await Coc7RollService.attribute(this.actor, key, {fastForward: event.shiftKey});
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Roll", error);
    }
  }

  static async _rollCharacteristic(event, target) {
    const key = target.dataset.characteristic;

    try {
      await this._closeShelfForRoll();
      await Coc7RollService.characteristic(this.actor, key, {fastForward: event.shiftKey});
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Roll", error);
    }
  }

  static async _rollDeathCheck() {
    try {
      await this._closeShelfForRoll();
      await Coc7RollService.deathCheck(this.actor);
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Roll", error);
    }
  }

  static async _rollGenericDie(_event, target) {
    const formula = target.dataset.diceFormula;

    try {
      await GenericDiceRollService.roll(this.actor, formula);
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.GenericRoll", error);
    }
  }

  static async _rollInitiative() {
    const actor = this.actor;

    try {
      await this._closeShelfForRoll();
      await CombatTrackerService.rollInitiative(actor);
    } catch (error) {
      this._notifyCombatError(error);
    }
  }

  static async _rollActionRequest(event, target) {
    const actionId = target.dataset.requestActionId;
    const skillId = target.dataset.requestSkillId || null;

    try {
      await this._closeShelfForRoll();
      await ActionRequestService.execute(this.actor, actionId, {
        skillId,
        fastForward: event.shiftKey
      });
      await this._renderMain();
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Roll", error);
    }
  }

  static async _toggleCombinedRequest(_event, target) {
    const check = ActionRequestService.describeCheck(this.actor, target.dataset.requestActionId, {
      skillId: target.dataset.requestSkillId || null
    });
    if (!check) return;
    this._toggleCombinedCheck(check);
    await this._renderMain();
  }

  static async _toggleCombinedCharacteristic(_event, target) {
    const check = ActionRequestService.describeCharacteristic(this.actor, target.dataset.characteristic);
    if (!check) return;
    this._toggleCombinedCheck(check);
    await this._renderMain();
  }

  static async _rollCombinedRequest() {
    if (this._requestCombinedSelections.size < 2) {
      ui.notifications.warn(game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Combined.MinimumWarning"));
      return;
    }

    try {
      const checks = [...this._requestCombinedSelections.values()];
      await this._closeShelfForRoll();
      await ActionRequestService.executeCombined(this.actor, checks, {operator: this._requestCombinedOperator});
      this._requestCombinedSelections.clear();
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Roll", error);
    }
  }

  static async _clearCombinedRequest() {
    if (!this._requestCombinedSelections.size) return;
    this._requestCombinedSelections.clear();
    await this._renderMain();
  }

  static async _setCombinedOperator(_event, target) {
    const operator = target.dataset.combinedOperator;
    if (!["all", "any"].includes(operator) || operator === this._requestCombinedOperator) return;
    this._requestCombinedOperator = operator;
    await this._renderMain();
  }

  static async _setRequestMode(_event, target) {
    const mode = target.dataset.requestMode;
    if (!["single", "combined"].includes(mode) || mode === this._requestMode) return;
    this._requestMode = mode;
    await this._renderMain();
  }

  static async _rollIncomingRequest(_event, target) {
    const requestId = target.dataset.requestId;
    const skillId = target.dataset.requestSkillId || null;
    const combinedModifiers = [...(target.closest(".c7ph-incoming-request")?.querySelectorAll("[data-incoming-combined-modifier][data-check-identity]") ?? [])]
      .map((select) => ({
        identity: select.dataset.checkIdentity,
        poolModifier: Math.max(-2, Math.min(2, Number(select.value) || 0))
      }));

    try {
      await this._closeShelfForRoll();
      await Coc7InteractionProvider.executeIncoming(requestId, {skillId, combinedModifiers});
      await this._renderMain();
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Roll", error);
    }
  }

  static async _dismissIncomingRequest(_event, target) {
    try {
      await Coc7InteractionProvider.dismissIncoming(target.dataset.requestId);
      await this._renderMain();
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Interface", error);
    }
  }

  static _setRequestCategory(_event, target) {
    const category = target.dataset.requestCategory;
    if (!category || this._requestCategory === category) return;
    this._requestCategory = category;
    this._applyRequestFilters();
  }

  static async _rollSkill(event, target) {
    const actor = this.actor;
    const itemId = target.dataset.skillId;
    const skill = actor?.items?.get(itemId);

    try {
      await this._closeShelfForRoll();
      await Coc7RollService.skill(actor, itemId, {fastForward: event.shiftKey});
      if (skill?.uuid) await PreferencesService.rememberRecentSkill(skill.uuid);
      await this._renderMain();
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Roll", error);
    }
  }

  static async _rollWeapon(event, target) {
    const actor = this.actor;
    const itemId = target.dataset.weaponId;
    const weapon = actor?.items?.get(itemId);

    try {
      if (!weapon || weapon.type !== "weapon") throw new Error(`Weapon not found: ${itemId}`);
      if (!AmmoService.canAttack(weapon)) {
        ui.notifications.warn(game.i18n.format(
          "GINZZZU_C7PH.Sections.Combat.NoAmmoWarning",
          {weapon: weapon.name}
        ));
        return;
      }

      AmmoService.trackRangedWeaponUse(weapon);
      await this._closeShelfForRoll();
      await Coc7RollService.weapon(actor, itemId, {fastForward: event.shiftKey});
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Roll", error);
    }
  }

  static async _rollWeaponDamage(_event, target) {
    const actor = this.actor;
    const itemId = target.dataset.weaponId;
    const rangeKey = target.dataset.damageRange || "normal";
    const weapon = actor?.items?.get(itemId);

    try {
      if (!weapon || weapon.type !== "weapon") throw new Error(`Weapon not found: ${itemId}`);
      await this._closeShelfForRoll();
      await WeaponDamageService.roll(actor, weapon, rangeKey);
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Roll", error);
    }
  }

  static async _setSkillView(_event, target) {
    const view = target.dataset.skillView;
    if (!Object.values(SKILL_VIEWS).includes(view) || this._skillView === view) return;

    this._skillView = view;
    try {
      await this._renderMain();
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Preference", error);
    }
  }

  static async _toggleCoreInterface() {
    try {
      UiVisibilityService.toggleCoreInterface();
      await this._renderMain();
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Interface", error);
    }
  }

  static async _toggleGunReady() {
    try {
      this._suppressShelfAnimation = true;
      await CombatTrackerService.toggleGunReady(this.actor);
    } catch (error) {
      this._notifyCombatError(error);
    }
  }

  static async _toggleCondition(_event, target) {
    const conditionId = target.dataset.conditionId;

    try {
      this._suppressShelfAnimation = true;
      await ConditionsService.toggle(this.actor, conditionId);
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.ConditionUpdate", error);
    }
  }

  static async _toggleFavoriteSkill(_event, target) {
    const uuid = target.dataset.skillUuid;

    try {
      await PreferencesService.toggleFavoriteSkill(uuid);
      await this._renderMain();
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Preference", error);
    }
  }

  static async _toggleVolumeMute(_event, target) {
    const key = target.dataset.volumeKey;

    try {
      await VolumeService.toggleMute(key);
      await this._renderMain();
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Volume", error);
    }
  }

  static async _toggleSection(event, target) {
    if (target.disabled) return;

    const section = target.dataset.section;
    if (!Object.hasOwn(SECTION_PRESENTATION, section)) return;

    const clickOnly = Boolean(SECTION_PRESENTATION[section]?.clickOnly);
    if (this._supportsHover && event.detail > 0 && !clickOnly) return;

    const activeSection = this._activeSection === section ? null : section;
    if (clickOnly && this._supportsHover) {
      this._pinnedSection = activeSection === section ? section : null;
    }

    try {
      await this._setActiveSection(activeSection, {persist: !this._supportsHover});
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Errors.Preference", error);
    }
  }

  _toggleCombinedCheck(check) {
    if (this._requestCombinedSelections.has(check.identity)) {
      this._requestCombinedSelections.delete(check.identity);
      return;
    }
    this._requestCombinedSelections.set(check.identity, check);
  }

  _activateShelfHover(root) {
    this._stopHoverMode();
    if (!this._supportsHover) return;

    const shell = root?.querySelector(".c7ph-shell");
    if (!shell) return;

    const listeners = [];
    const listen = (element, type, handler) => {
      element.addEventListener(type, handler);
      listeners.push([element, type, handler]);
    };

    listen(shell, "pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      this._clearCloseTimer();
    });

    listen(shell, "pointerleave", (event) => {
      if (event.pointerType === "touch" || this._hoverRenderInProgress) return;
      if (this._pinnedSection && this._activeSection === this._pinnedSection) return;
      this._clearOpenTimer();
      this._clearCloseTimer();
      this._hoverCloseTimer = globalThis.setTimeout(() => {
        this._hoverCloseTimer = null;
        if (!this._activeSection) return;
        void this._setActiveSection(null).catch((error) => {
          this._notifyError("GINZZZU_C7PH.Errors.Preference", error);
        });
      }, HOVER_CLOSE_DELAY);
    });

    for (const button of shell.querySelectorAll('[data-action="toggleSection"][data-section]')) {
      if (button.disabled || button.dataset.clickOnly === "true") continue;

      listen(button, "pointerenter", (event) => {
        if (event.pointerType === "touch") return;
        this._clearOpenTimer();
        this._clearCloseTimer();

        const section = button.dataset.section;
        if (!Object.hasOwn(SECTION_PRESENTATION, section) || this._activeSection === section) return;

        this._hoverOpenTimer = globalThis.setTimeout(() => {
          this._hoverOpenTimer = null;
          this._pinnedSection = null;
          void this._setActiveSection(section).catch((error) => {
            this._notifyError("GINZZZU_C7PH.Errors.Preference", error);
          });
        }, HOVER_OPEN_DELAY);
      });

      listen(button, "pointerleave", () => this._clearOpenTimer());
    }

    this._hoverCleanup = () => {
      for (const [element, type, handler] of listeners) {
        element.removeEventListener(type, handler);
      }
      this._hoverCleanup = null;
    };
  }

  _activateCombatControls(root) {
    for (const input of root?.querySelectorAll("[data-weapon-ammo][data-weapon-id]") ?? []) {
      input.addEventListener("click", (event) => event.stopPropagation());
      input.addEventListener("wheel", (event) => event.currentTarget.blur(), {passive: true});
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      });
      input.addEventListener("change", async (event) => {
        const currentInput = event.currentTarget;
        const actor = this.actor;
        const weapon = actor?.items?.get(currentInput.dataset.weaponId);

        try {
          await AmmoService.updateCurrent(actor, currentInput.dataset.weaponId, currentInput.value);
        } catch (error) {
          currentInput.value = AmmoService.current(weapon);
          this._notifyError("GINZZZU_C7PH.Errors.AmmoUpdate", error);
        }
      });
    }
  }

  _activateSkillSearch(root) {
    const input = root?.querySelector("[data-skill-search]");
    if (!input) return;

    if (this._restoreSkillSearch) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      this._restoreSkillSearch = false;
    }

    input.addEventListener("input", (event) => {
      this._skillQuery = event.currentTarget.value;
      this._clearSkillSearchTimer();
      this._skillSearchTimer = globalThis.setTimeout(() => {
        this._skillSearchTimer = null;
        this._restoreSkillSearch = true;
        void this._renderMain().catch((error) => {
          this._notifyError("GINZZZU_C7PH.Errors.Preference", error);
        });
      }, SKILL_SEARCH_DELAY);
    });
  }

  _activateRequestSearch(root) {
    const input = root?.querySelector("[data-request-search]");
    if (!input) return;

    input.addEventListener("input", (event) => {
      this._requestQuery = event.currentTarget.value;
      this._applyRequestFilters(root);
    });
    this._applyRequestFilters(root);
  }

  _activateRequestCombinedModifiers(root) {
    for (const select of root?.querySelectorAll("[data-combined-modifier][data-combined-identity]") ?? []) {
      select.addEventListener("change", (event) => {
        const current = event.currentTarget;
        const identity = current.dataset.combinedIdentity;
        const selected = this._requestCombinedSelections.get(identity);
        if (!selected) return;
        selected.poolModifier = Math.max(-2, Math.min(2, Number(current.value) || 0));
        this._requestCombinedSelections.set(identity, selected);
      });
    }
  }

  _applyRequestFilters(root = this.element) {
    if (!root) return;
    const query = String(this._requestQuery ?? "").trim().toLocaleLowerCase(game.i18n.lang);
    const category = this._requestCategory || "all";

    for (const button of root.querySelectorAll("[data-request-category]")) {
      button.classList.toggle("is-active", button.dataset.requestCategory === category);
    }

    let visibleCount = 0;
    for (const entry of root.querySelectorAll("[data-request-entry]")) {
      const categoryMatches = category === "all" || entry.dataset.requestCategory === category;
      const haystack = String(entry.dataset.searchText ?? "").toLocaleLowerCase(game.i18n.lang);
      const queryMatches = !query || haystack.includes(query);
      entry.hidden = !(categoryMatches && queryMatches);
      if (!entry.hidden) visibleCount += 1;
    }

    const empty = root.querySelector("[data-request-filter-empty]");
    if (empty) empty.hidden = visibleCount > 0;
  }

  _activateVolumeControls(root) {
    for (const input of root?.querySelectorAll("[data-volume-range][data-volume-key]") ?? []) {
      input.addEventListener("change", async (event) => {
        const currentInput = event.currentTarget;

        try {
          await VolumeService.set(currentInput.dataset.volumeKey, currentInput.value);
          await this._renderMain();
        } catch (error) {
          this._notifyError("GINZZZU_C7PH.Errors.Volume", error);
        }
      });
    }
  }

  _scrollChatToLatest(root) {
    if (this._activeSection !== SECTIONS.CHAT) return;

    const list = root?.querySelector(".c7ph-chat-list");
    if (!list) return;

    list.scrollTop = list.scrollHeight;
  }

  _clearCloseTimer() {
    if (this._hoverCloseTimer !== null) globalThis.clearTimeout(this._hoverCloseTimer);
    this._hoverCloseTimer = null;
  }

  _clearOpenTimer() {
    if (this._hoverOpenTimer !== null) globalThis.clearTimeout(this._hoverOpenTimer);
    this._hoverOpenTimer = null;
  }

  _clearSkillSearchTimer() {
    if (this._skillSearchTimer !== null) globalThis.clearTimeout(this._skillSearchTimer);
    this._skillSearchTimer = null;
  }

  async refreshChatFromHook() {
    if (this._activeSection !== SECTIONS.CHAT) return;
    this._suppressShelfAnimation = true;
    await this._renderMain();
  }

  async refreshFromHook() {
    // Hook-driven document updates replace the rendered shelf. Suppress the
    // entrance animation while any shelf is already open so condition and
    // ammunition changes feel like an in-place refresh rather than a reopen.
    if (this._activeSection) this._suppressShelfAnimation = true;
    await this._renderMain();
  }

  async _renderMain() {
    const shelfState = this._captureShelfUiState();
    if (this._activeSection) this._suppressShelfAnimation = true;
    this._hoverRenderInProgress = true;
    try {
      await this.render({parts: ["main"]});
      this._restoreShelfUiState(shelfState);
    } finally {
      globalThis.queueMicrotask(() => {
        this._hoverRenderInProgress = false;
      });
    }
  }

  _captureShelfUiState() {
    const root = this.element;
    if (!root || !this._activeSection) return null;

    const scroll = SHELF_SCROLL_SELECTORS.map((selector) => {
      const element = root.querySelector(selector);
      return element ? {selector, top: element.scrollTop, left: element.scrollLeft} : null;
    }).filter(Boolean);

    const active = root.ownerDocument?.activeElement;
    const focus = active && root.contains(active)
      ? {
          action: active.dataset?.action ?? "",
          skillView: active.dataset?.skillView ?? "",
          skillUuid: active.dataset?.skillUuid ?? "",
          volumeKey: active.dataset?.volumeKey ?? "",
          requestCategory: active.dataset?.requestCategory ?? "",
          requestActionId: active.dataset?.requestActionId ?? "",
          requestSkillId: active.dataset?.requestSkillId ?? "",
          characteristic: active.dataset?.characteristic ?? "",
          combinedOperator: active.dataset?.combinedOperator ?? "",
          requestMode: active.dataset?.requestMode ?? "",
          isSkillSearch: active.matches?.("[data-skill-search]") ?? false,
          isRequestSearch: active.matches?.("[data-request-search]") ?? false
        }
      : null;

    return {section: this._activeSection, scroll, focus};
  }

  _restoreShelfUiState(state) {
    if (!state || state.section !== this._activeSection) return;
    const root = this.element;
    if (!root) return;

    globalThis.requestAnimationFrame(() => {
      for (const entry of state.scroll) {
        const element = root.querySelector(entry.selector);
        if (!element) continue;
        element.scrollTop = Math.min(entry.top, Math.max(0, element.scrollHeight - element.clientHeight));
        element.scrollLeft = Math.min(entry.left, Math.max(0, element.scrollWidth - element.clientWidth));
      }

      const focus = state.focus;
      if (!focus) return;
      let target = null;
      if (focus.isSkillSearch) target = root.querySelector("[data-skill-search]");
      else if (focus.isRequestSearch) target = root.querySelector("[data-request-search]");
      else if (focus.skillView) target = root.querySelector(`[data-skill-view="${CSS.escape(focus.skillView)}"]`);
      else if (focus.skillUuid) target = root.querySelector(`[data-skill-uuid="${CSS.escape(focus.skillUuid)}"]`);
      else if (focus.volumeKey) target = root.querySelector(`[data-volume-key="${CSS.escape(focus.volumeKey)}"]`);
      else if (focus.requestCategory) target = root.querySelector(`[data-request-category="${CSS.escape(focus.requestCategory)}"]`);
      else if (focus.requestActionId) {
        const action = CSS.escape(focus.action);
        const requestActionId = CSS.escape(focus.requestActionId);
        const skill = focus.requestSkillId ? `[data-request-skill-id="${CSS.escape(focus.requestSkillId)}"]` : "";
        target = root.querySelector(`[data-action="${action}"][data-request-action-id="${requestActionId}"]${skill}`);
      } else if (focus.characteristic && focus.action) {
        target = root.querySelector(`[data-action="${CSS.escape(focus.action)}"][data-characteristic="${CSS.escape(focus.characteristic)}"]`);
      } else if (focus.combinedOperator) target = root.querySelector(`[data-combined-operator="${CSS.escape(focus.combinedOperator)}"]`);
      else if (focus.requestMode) target = root.querySelector(`[data-request-mode="${CSS.escape(focus.requestMode)}"]`);
      else if (focus.action) target = root.querySelector(`[data-action="${CSS.escape(focus.action)}"]`);
      target?.focus?.({preventScroll: true});
    });
  }

  async _closeShelfForRoll() {
    if (!this._activeSection) return;

    this._pinnedSection = null;
    this._stopHoverMode();
    await this._setActiveSection(null, {persist: !this._supportsHover});
  }

  async _setActiveSection(activeSection, {persist = false} = {}) {
    if (this._activeSection === activeSection) return;

    this._pinnedSection = null;
    this._activeSection = activeSection;
    if (persist) await PreferencesService.update({activeSection});

    await this._renderMain();
  }

  _stopHoverMode() {
    this._clearOpenTimer();
    this._clearCloseTimer();
    this._hoverCleanup?.();
  }

  get _supportsHover() {
    return Boolean(globalThis.matchMedia?.("(hover: hover) and (pointer: fine)").matches);
  }

  _notifyCombatError(error) {
    if (error instanceof CombatTrackerError && error.i18nKey) {
      console.warn(`${MODULE_ID} | ${error.i18nKey}`, error);
      ui.notifications.warn(game.i18n.localize(error.i18nKey));
      return;
    }
    this._notifyError("GINZZZU_C7PH.Errors.Combat", error);
  }

  _notifyError(key, error) {
    console.error(`${MODULE_ID} | ${key}`, error);
    ui.notifications.error(game.i18n.localize(key));
  }
}
