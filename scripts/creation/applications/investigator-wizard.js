import { MODULE_ID } from "../../constants.js";
import { CREATION_APP_ID } from "../constants.js";
import {
  modifyAgeAdjustment,
  rollEducationImprovements,
  rollSecondLuck
} from "../actions/age-actions.js";
import {
  modifyCharacteristicPoints,
  rollAllCharacteristics,
  rollCharacteristic,
  toggleCharacteristicSwapGroup,
  undoCharacteristicSwap
} from "../actions/characteristic-actions.js";
import {
  nextStep,
  previousStep,
  resetDraft,
  selectOccupation,
  selectSetup,
  setStep
} from "../actions/navigation-actions.js";
import { buildWizardContext } from "../context/wizard-context.js";
import { createInvestigator } from "../actions/review-actions.js";
import { AgeInputController } from "../controllers/age-input-controller.js";
import { AllocationViewStateController } from "../controllers/allocation-view-state-controller.js";
import { BackstoryController } from "../controllers/backstory-controller.js";
import { CharacteristicDragController } from "../controllers/characteristic-drag-controller.js";
import { CharacteristicPointController } from "../controllers/characteristic-point-controller.js";
import { OccupationSearchController } from "../controllers/occupation-search-controller.js";
import { OccupationSkillController } from "../controllers/occupation-skill-controller.js";
import { PersonalInterestController } from "../controllers/personal-interest-controller.js";
import { PersonalDataController } from "../controllers/personal-data-controller.js";
import { CreationAccessService } from "../services/creation-access-service.js";
import { CreationProgressService } from "../services/creation-progress-service.js";
import { CreationSourceService } from "../services/creation-source-service.js";
import {
  selectOccupationPointCharacteristic,
  toggleOccupationGroupSkill
} from "../actions/occupation-skill-actions.js";
import { DraftService } from "../services/draft-service.js";
import { OccupationSkillService } from "../services/occupation-skill-service.js";
import { PersonalInterestService } from "../services/personal-interest-service.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class InvestigatorWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  _draft = null;
  _creationPending = false;
  _ageInput = new AgeInputController(this);
  _allocationViewState = new AllocationViewStateController();
  _backstory = new BackstoryController(this);
  _occupationQuery = "";
  _occupationScrollTop = 0;
  _sources = null;
  _characteristicDrag = new CharacteristicDragController(this);
  _characteristicPoints = new CharacteristicPointController(this);
  _occupationSearch = new OccupationSearchController(this);
  _occupationSkills = new OccupationSkillController(this);
  _personalInterests = new PersonalInterestController(this);
  _personalData = new PersonalDataController(this);
  _progressFinalized = false;
  _progressInitialized = false;

  static DEFAULT_OPTIONS = {
    id: CREATION_APP_ID,
    tag: "section",
    classes: [MODULE_ID, "c7ph-investigator-wizard"],
    position: {
      width: 1080,
      height: 760
    },
    window: {
      minimizable: true,
      resizable: true,
      title: "GINZZZU_C7PH.Creation.Title"
    },
    actions: {
      createInvestigator: this._createInvestigator,
      modifyAgeAdjustment: this._modifyAgeAdjustment,
      modifyCharacteristicPoints: this._modifyCharacteristicPoints,
      nextStep: this._nextStep,
      previousStep: this._previousStep,
      resetDraft: this._resetDraft,
      rollAllCharacteristics: this._rollAllCharacteristics,
      rollEducationImprovements: this._rollEducationImprovements,
      rollCharacteristic: this._rollCharacteristic,
      rollSecondLuck: this._rollSecondLuck,
      selectOccupation: this._selectOccupation,
      selectOccupationPointCharacteristic: this._selectOccupationPointCharacteristic,
      selectSetup: this._selectSetup,
      setStep: this._setStep,
      toggleCharacteristicSwapGroup: this._toggleCharacteristicSwapGroup,
      toggleOccupationGroupSkill: this._toggleOccupationGroupSkill,
      undoCharacteristicSwap: this._undoCharacteristicSwap
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/creation/investigator-wizard.hbs`
    }
  };

  static async open() {
    const access = CreationAccessService.resolve();
    if (!access.canOpen) {
      ui.notifications.info(
        game.i18n.localize("GINZZZU_C7PH.Creation.Warnings.AlreadyCompleted")
      );
      return null;
    }

    const existing = foundry.applications.instances.get(CREATION_APP_ID);
    if (existing) {
      if (!existing.rendered) await existing.render({force: true});
      if (existing.minimized) await existing.maximize();
      existing.bringToFront?.();
      return existing;
    }

    const application = new InvestigatorWizard();
    await application.render({force: true});
    return application;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    await this._ensureState();
    if (!this._progressInitialized) {
      this._progressInitialized = true;
      try {
        await CreationProgressService.flush(this._draft);
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to initialize investigator creation progress`, error);
      }
    }
    return buildWizardContext(this, context);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._ageInput.activate(this.element);
    this._allocationViewState.activate(this.element);
    this._backstory.activate(this.element);
    this._characteristicDrag.activate(this.element);
    this._characteristicPoints.activate(this.element);
    this._occupationSearch.activate(this.element);
    this._occupationSkills.activate(this.element);
    this._personalInterests.activate(this.element);
    this._personalData.activate(this.element);
  }

  async _onClose(options) {
    if (!this._progressFinalized) {
      try {
        await CreationProgressService.flush(this._draft);
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to flush investigator creation progress`, error);
      }
    }
    this._ageInput.destroy();
    this._allocationViewState.destroy();
    this._backstory.destroy();
    this._occupationSearch.destroy();
    this._occupationSkills.destroy();
    this._personalInterests.destroy();
    this._personalData.destroy();
    this._characteristicDrag.destroy(this.element);
    this._characteristicPoints.destroy();
    return super._onClose(options);
  }

  static async _createInvestigator(event) {
    event?.preventDefault();
    event?.stopPropagation();
    await createInvestigator(this);
  }

  static async _modifyAgeAdjustment(_event, target) {
    await modifyAgeAdjustment(this, target);
  }

  static async _modifyCharacteristicPoints(event, target) {
    await modifyCharacteristicPoints(this, target, event);
  }

  static async _nextStep() {
    await nextStep(this);
  }

  static async _previousStep() {
    await previousStep(this);
  }

  static async _resetDraft() {
    await resetDraft(this);
  }

  static async _rollAllCharacteristics() {
    await rollAllCharacteristics(this);
  }

  static async _rollCharacteristic(_event, target) {
    await rollCharacteristic(this, target);
  }

  static async _rollEducationImprovements() {
    await rollEducationImprovements(this);
  }

  static async _rollSecondLuck() {
    await rollSecondLuck(this);
  }

  static async _toggleOccupationGroupSkill(_event, target) {
    await toggleOccupationGroupSkill(this, target);
  }

  static async _toggleCharacteristicSwapGroup(_event, target) {
    await toggleCharacteristicSwapGroup(this, target);
  }

  static async _undoCharacteristicSwap(_event, target) {
    await undoCharacteristicSwap(this, target);
  }

  static async _selectOccupation(_event, target) {
    await selectOccupation(this, target);
  }

  static async _selectOccupationPointCharacteristic(_event, target) {
    await selectOccupationPointCharacteristic(this, target);
  }

  static async _selectSetup(_event, target) {
    await selectSetup(this, target);
  }

  static async _setStep(_event, target) {
    await setStep(this, target);
  }

  async _ensureState() {
    if (!this._draft) this._draft = DraftService.load();
    if (!this._sources) this._sources = await CreationSourceService.load();

    try {
      const occupationUuid = this._draft.occupation.uuid;
      if (!this._sources.available || !this._draft.setup.uuid || !occupationUuid) return;

      const definition = await CreationSourceService.getOccupationDefinition(occupationUuid);
      if (!definition) return;

      const current = this._draft.toObject();
      const occupationState = current.occupationProcess.occupationUuid === occupationUuid
        ? OccupationSkillService.reconcile({definition, draft: current})
        : OccupationSkillService.createInitialState({definition, draft: current});
      const personalState = PersonalInterestService.reconcile({
        draft: {...current, ...occupationState},
        skillOptions: this._sources.skills,
        skills: occupationState.skills
      });
      const reconciled = {
        occupationProcess: occupationState.occupationProcess,
        skills: personalState.skills
      };
      const processChanged = JSON.stringify(current.occupationProcess)
        !== JSON.stringify(reconciled.occupationProcess);
      const skillsChanged = JSON.stringify(current.skills) !== JSON.stringify(reconciled.skills);
      if (processChanged || skillsChanged) {
        this._draft = await DraftService.update(this._draft, reconciled);
      }
    } catch (error) {
      this._notifyError("GINZZZU_C7PH.Creation.Warnings.OccupationSkillsLoad", error);
    }
  }

  _notifyError(key, error) {
    console.error(`${MODULE_ID} | ${key}`, error);
    ui.notifications.error(game.i18n.localize(key));
  }

  _notifyWarning(key) {
    ui.notifications.warn(game.i18n.localize(key));
  }
}
