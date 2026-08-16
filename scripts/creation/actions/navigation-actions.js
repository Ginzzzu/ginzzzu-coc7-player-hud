import { MODULE_ID } from "../../constants.js";
import {
  CHARACTERISTIC_SWAP_GROUPS,
  CREATION_CHARACTERISTIC_METHODS,
  CREATION_STEP_ORDER
} from "../constants.js";
import { CreationProgressService } from "../services/creation-progress-service.js";
import { CreationSourceService } from "../services/creation-source-service.js";
import { AgeAdjustmentService } from "../services/age-adjustment-service.js";
import { CharacteristicPointService } from "../services/characteristic-point-service.js";
import { DraftService } from "../services/draft-service.js";
import { OccupationSkillService } from "../services/occupation-skill-service.js";
import { entryWarning } from "../context/wizard-context.js";

export async function nextStep(application) {
  const index = CREATION_STEP_ORDER.indexOf(application._draft.currentStep);
  if (index < 0 || index >= CREATION_STEP_ORDER.length - 1) return;
  await changeStep(application, CREATION_STEP_ORDER[index + 1]);
}

export async function previousStep(application) {
  const index = CREATION_STEP_ORDER.indexOf(application._draft.currentStep);
  if (index <= 0) return;
  await changeStep(application, CREATION_STEP_ORDER[index - 1]);
}

export async function resetDraft(application) {
  await pendingFieldSaves(application);
  try {
    application._draft = await DraftService.reset();
    application._progressInitialized = false;
    application._occupationQuery = "";
    application._occupationScrollTop = 0;
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}

export async function selectOccupation(application, target) {
  application._occupationSearch.captureScroll(application.element);
  const uuid = target.dataset.occupationUuid;
  const occupation = application._sources?.occupations.find((entry) => entry.uuid === uuid);
  if (!occupation || application._draft.occupation.uuid === uuid) return;

  try {
    const definition = await CreationSourceService.getOccupationDefinition(uuid);
    if (!definition) {
      application._notifyWarning("GINZZZU_C7PH.Creation.Warnings.OccupationSkillsLoad");
      return;
    }
    const occupationReference = {
      cocid: occupation.cocid,
      creditMax: occupation.creditMax,
      creditMin: occupation.creditMin,
      documentId: occupation.documentId,
      img: occupation.img,
      name: occupation.name,
      pack: occupation.pack,
      source: occupation.source,
      uuid: occupation.uuid
    };
    const initial = OccupationSkillService.createInitialState({
      definition,
      draft: application._draft
    });
    application._draft = await DraftService.update(application._draft, {
      occupation: occupationReference,
      ...initial
    });
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}

export async function selectSetup(application, target) {
  const uuid = target?.dataset?.setupUuid;
  const setup = application._sources?.setups?.find((entry) => entry.uuid === uuid);
  if (!setup) return;

  try {
    application._draft = await applySetup(application._draft, setup);
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}

export async function setStep(application, target) {
  await changeStep(application, target.dataset.creationStep);
}

export async function applySetup(draft, setup) {
  const source = draft.toObject();
  const sameSetup = source.setup?.uuid === setup.uuid
    || source.setup?.cocid === setup.cocid;
  let characteristics = foundry.utils.deepClone(source.characteristics ?? {});

  for (const definition of setup.characteristicFormulas) {
    if (!characteristics[definition.key]) continue;
    characteristics[definition.key].formula = definition.formula;
  }

  const changes = {
    setup: {
      characteristicMethod: setup.characteristicMethod,
      cocid: setup.cocid,
      documentId: setup.documentId,
      img: setup.img,
      name: setup.name,
      pack: setup.pack,
      pointBudget: setup.pointBudget,
      source: setup.source,
      uuid: setup.uuid
    }
  };

  if (!sameSetup) {
    for (const entry of Object.values(characteristics)) {
      entry.ageAdjustment = 0;
      entry.assignedValue = null;
      entry.rolledValue = null;
    }
    if (setup.characteristicMethod === CREATION_CHARACTERISTIC_METHODS.POINTS) {
      characteristics = CharacteristicPointService.initialize(characteristics);
    }
    const resetAge = AgeAdjustmentService.initialize({age: null, characteristics});
    changes.age = null;
    changes.ageProcess = resetAge.ageProcess;
    changes.characteristics = resetAge.characteristics;
    changes.characteristicSwaps = Object.fromEntries(
      Object.values(CHARACTERISTIC_SWAP_GROUPS).map((groupId) => [groupId, {
        enabled: false,
        sourceKey: null,
        targetKey: null
      }])
    );
    changes.occupation = {
      cocid: null,
      creditMax: null,
      creditMin: null,
      documentId: null,
      img: null,
      name: null,
      pack: null,
      source: null,
      uuid: null
    };
    changes.occupationProcess = {
      groupSelections: [],
      occupationUuid: null,
      personalSelections: [],
      pointCharacteristic: null
    };
    changes.skills = [];
  } else {
    changes.characteristics = characteristics;
  }

  return DraftService.update(draft, changes);
}

export async function changeStep(application, step) {
  await pendingFieldSaves(application);
  if (!CREATION_STEP_ORDER.includes(step) || step === application._draft.currentStep) return;

  const currentIndex = CREATION_STEP_ORDER.indexOf(application._draft.currentStep);
  const targetIndex = CREATION_STEP_ORDER.indexOf(step);
  if (targetIndex > currentIndex) {
    const warning = await entryWarning(application, step);
    if (warning) {
      application._notifyWarning(warning);
      return;
    }
  }

  try {
    application._draft = await DraftService.update(application._draft, {currentStep: step});
    try {
      await CreationProgressService.flush(application._draft);
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to publish the current creation step`, error);
    }
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}

async function pendingFieldSaves(application) {
  await Promise.all([
    application._backstory?.saveQueue,
    application._personalData?.saveQueue
  ].filter(Boolean));
}
