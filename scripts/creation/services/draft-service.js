import { MODULE_ID } from "../../constants.js";
import {
  CHARACTERISTIC_KEYS,
  CHARACTERISTIC_SWAP_GROUPS,
  CREATION_CHARACTERISTIC_METHODS,
  CREATION_DRAFT_FLAG,
  CREATION_DRAFT_SCHEMA_VERSION,
  CREATION_STEP_ORDER,
  CREATION_STEPS
} from "../constants.js";
import { InvestigatorDraft } from "../models/investigator-draft.js";
import { AgeAdjustmentService } from "./age-adjustment-service.js";
import { BackstoryService } from "./backstory-service.js";
import { CreationProgressService } from "./creation-progress-service.js";
import { PersonalDataService } from "./personal-data-service.js";

export class DraftService {
  static createDefault() {
    return new InvestigatorDraft({
      currentStep: CREATION_STEPS.SETUP,
      schemaVersion: CREATION_DRAFT_SCHEMA_VERSION
    });
  }

  static load(user = game.user) {
    const stored = user?.getFlag(MODULE_ID, CREATION_DRAFT_FLAG);
    if (!stored) return this.createDefault();

    try {
      const compatible = foundry.utils.deepClone(stored);
      if (compatible.currentStep === CREATION_STEPS.BACKSTORY) {
        compatible.currentStep = CREATION_STEPS.PERSONAL_DATA;
      }
      if (!AgeAdjustmentService.isValidAge(compatible.age)) compatible.age = null;
      return this.#normalize(new InvestigatorDraft(compatible));
    } catch (error) {
      console.error(`${MODULE_ID} | Invalid investigator draft; using a new draft`, error);
      return this.createDefault();
    }
  }

  static async reset({preserveProgress = false, user = game.user} = {}) {
    try {
      await user?.unsetFlag(MODULE_ID, CREATION_DRAFT_FLAG);
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to clear investigator draft`, error);
      throw error;
    }

    if (!preserveProgress) {
      try {
        await CreationProgressService.clear({user});
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to clear investigator creation progress`, error);
      }
    }

    return this.createDefault();
  }

  static async save(draft, {user = game.user} = {}) {
    const model = draft instanceof InvestigatorDraft
      ? this.#normalize(draft)
      : this.#normalize(new InvestigatorDraft(draft ?? {}));

    try {
      await user?.setFlag(MODULE_ID, CREATION_DRAFT_FLAG, model.toObject());
      CreationProgressService.schedule(model, {user});
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to save investigator draft`, error);
      throw error;
    }

    return model;
  }

  static async update(draft, changes = {}, options = {}) {
    const current = (draft instanceof InvestigatorDraft ? draft : this.load()).toObject();
    const merged = foundry.utils.mergeObject(current, changes, {
      inplace: false,
      insertKeys: true,
      insertValues: true,
      overwrite: true,
      recursive: true
    });

    if (merged.currentStep === CREATION_STEPS.BACKSTORY) {
      merged.currentStep = CREATION_STEPS.PERSONAL_DATA;
    }

    return this.save(new InvestigatorDraft({
      ...merged,
      schemaVersion: CREATION_DRAFT_SCHEMA_VERSION
    }), options);
  }

  static #normalize(draft) {
    const source = draft.toObject();
    const migratedStep = source.currentStep === CREATION_STEPS.BACKSTORY
      ? CREATION_STEPS.PERSONAL_DATA
      : source.currentStep;
    const currentStep = CREATION_STEP_ORDER.includes(migratedStep)
      ? migratedStep
      : CREATION_STEPS.SETUP;

    const characteristics = foundry.utils.deepClone(source.characteristics ?? {});
    for (const key of CHARACTERISTIC_KEYS) {
      const entry = characteristics[key] ?? {};
      const rolledValue = Number(entry.rolledValue);
      const hasRolledValue = (
        entry.rolledValue !== null
        && entry.rolledValue !== undefined
        && Number.isFinite(rolledValue)
      );
      const assignedValue = Number(entry.assignedValue);
      const hasAssignedValue = (
        entry.assignedValue !== null
        && entry.assignedValue !== undefined
        && Number.isFinite(assignedValue)
      );

      characteristics[key] = {
        ...entry,
        assignedValue: hasAssignedValue ? assignedValue : (hasRolledValue ? rolledValue : null),
        rolledValue: hasRolledValue ? rolledValue : null
      };
    }

    const setupSource = foundry.utils.deepClone(source.setup ?? {});
    const inferredPointMethod = setupSource.cocid === "i.setup.standard-2-ru";
    const setup = {
      ...setupSource,
      characteristicMethod: inferredPointMethod
        ? CREATION_CHARACTERISTIC_METHODS.POINTS
        : (Object.values(CREATION_CHARACTERISTIC_METHODS).includes(
          setupSource.characteristicMethod
        ) ? setupSource.characteristicMethod : CREATION_CHARACTERISTIC_METHODS.ROLL),
      pointBudget: Math.max(0, Number.parseInt(setupSource.pointBudget, 10) || 0)
    };

    const characteristicSwaps = foundry.utils.deepClone(source.characteristicSwaps ?? {});
    for (const groupId of Object.values(CHARACTERISTIC_SWAP_GROUPS)) {
      const state = characteristicSwaps[groupId] ?? {};
      characteristicSwaps[groupId] = {
        enabled: Boolean(state.enabled),
        sourceKey: state.sourceKey ?? null,
        targetKey: state.targetKey ?? null
      };
    }

    const age = AgeAdjustmentService.normalizeAge(source.age);
    let ageProcess = foundry.utils.deepClone(source.ageProcess ?? {});
    if (age === null || ageProcess.ageAtCalculation !== age) {
      const initialized = AgeAdjustmentService.initialize({age, characteristics});
      ageProcess = initialized.ageProcess;
      Object.assign(characteristics, initialized.characteristics);
    } else {
      const policy = AgeAdjustmentService.policy(age);
      ageProcess = {
        ageAtCalculation: age,
        educationChecks: Array.isArray(ageProcess.educationChecks)
          ? ageProcess.educationChecks.slice(0, policy?.educationChecks ?? 0)
          : [],
        luckSecondRoll: (
          ageProcess.luckSecondRoll !== null
          && ageProcess.luckSecondRoll !== undefined
          && Number.isFinite(Number(ageProcess.luckSecondRoll))
        ) ? Number(ageProcess.luckSecondRoll) : null
      };
    }

    const occupationProcessSource = source.occupationProcess ?? {};
    const occupationProcess = {
      groupSelections: Array.isArray(occupationProcessSource.groupSelections)
        ? occupationProcessSource.groupSelections.map((entry) => ({
          cocids: Array.isArray(entry?.cocids)
            ? [...new Set(entry.cocids.filter((cocid) => typeof cocid === "string" && cocid))]
            : [],
          groupIndex: Math.max(0, Number.parseInt(entry?.groupIndex, 10) || 0)
        }))
        : [],
      occupationUuid: occupationProcessSource.occupationUuid ?? null,
      personalSelections: Array.isArray(occupationProcessSource.personalSelections)
        ? occupationProcessSource.personalSelections.map((entry) => ({
          cocid: entry?.cocid ?? null,
          slotIndex: Math.max(0, Number.parseInt(entry?.slotIndex, 10) || 0)
        }))
        : [],
      pointCharacteristic: occupationProcessSource.pointCharacteristic ?? null
    };

    const skills = Array.isArray(source.skills)
      ? source.skills.map((skill) => ({
        ...skill,
        developmentMarked: false,
        experience: 0,
        requiresName: Boolean(skill.requiresName),
        slotId: skill.slotId ?? null,
        sourceCocid: skill.sourceCocid ?? skill.cocid ?? null
      }))
      : [];

    return new InvestigatorDraft({
      ...source,
      age,
      ageProcess,
      backstory: BackstoryService.normalize(source.backstory),
      characteristicSwaps,
      characteristics,
      currentStep,
      occupationProcess,
      personalData: PersonalDataService.normalize(source.personalData),
      schemaVersion: CREATION_DRAFT_SCHEMA_VERSION,
      setup,
      skills
    });
  }
}
