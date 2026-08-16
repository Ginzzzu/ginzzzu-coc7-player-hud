import {
  POINT_BUY_CHARACTERISTIC_KEYS,
  CREATION_STEP_ORDER,
  CREATION_STEP_PRESENTATION,
  CREATION_STEPS
} from "../constants.js";
import { CharacteristicPointService } from "../services/characteristic-point-service.js";
import { CharacteristicSwapService } from "../services/characteristic-swap-service.js";
import { CreationSourceService } from "../services/creation-source-service.js";
import { prepareBackstoryContext } from "./backstory-context.js";
import { ageComplete, prepareAgeContext } from "./age-context.js";
import { prepareDerivedContext } from "./derived-context.js";
import { prepareOccupationSkillsContext } from "./occupation-skills-context.js";
import { preparePersonalInterestsContext } from "./personal-interests-context.js";
import { preparePersonalDataContext } from "./personal-data-context.js";
import { prepareReviewContext } from "./review-context.js";

function modelObject(model, fallback = {}) {
  return model?.toObject?.() ?? fallback;
}

export function prepareCharacteristicRolls(application) {
  const draftObject = application._draft?.toObject?.() ?? {};
  const characteristicSource = modelObject(
    application._draft?.characteristics,
    draftObject.characteristics ?? {}
  );
  const swapSource = modelObject(
    application._draft?.characteristicSwaps,
    draftObject.characteristicSwaps ?? {}
  );

  const selectedSetup = CreationSourceService.selectedSetup({
    draft: application._draft,
    sources: application._sources
  });
  const pointMethod = CharacteristicPointService.isPointMethod(application._draft);
  const rolls = (selectedSetup?.characteristicFormulas ?? [])
    .map((definition) => {
      const entry = characteristicSource[definition.key] ?? {};
      const originalValue = Number(entry.rolledValue);
      const hasOriginalValue = (
        entry.rolledValue !== null
        && entry.rolledValue !== undefined
        && Number.isFinite(originalValue)
      );
      const currentValue = CharacteristicSwapService.currentValue(entry);
      const hasValue = hasOriginalValue && Number.isFinite(currentValue);
      const swapGroup = CharacteristicSwapService.groupForKey(definition.key);
      const swapState = swapGroup
        ? CharacteristicSwapService.groupState(swapSource, swapGroup)
        : null;

      return {
        canRoll: Boolean(String(definition.formula ?? "").trim())
          && (!pointMethod || definition.key === "luck"),
        extremeValue: hasValue ? Math.floor(currentValue / 5) : null,
        formula: definition.formula,
        halfValue: hasValue ? Math.floor(currentValue / 2) : null,
        hasValue,
        isSwapped: hasValue && currentValue !== originalValue,
        key: definition.key,
        label: definition.label,
        originalValue: hasOriginalValue ? originalValue : null,
        rollLabel: game.i18n.localize(
          hasValue
            ? "GINZZZU_C7PH.Creation.Characteristics.Reroll"
            : "GINZZZU_C7PH.Creation.Characteristics.Roll"
        ),
        rolledValue: hasValue ? currentValue : null,
        swapGroup,
        swapGroupClass: swapGroup ? `is-group-${swapGroup}` : "",
        swapGroupEnabled: Boolean(swapState?.enabled),
        swapGroupUsed: Boolean(swapState?.used)
      };
    });

  const complete = rolls.length > 0 && rolls.every((entry) => entry.hasValue);
  return rolls.map((entry) => ({
    ...entry,
    canDrag: Boolean(
      complete
      && entry.swapGroup
      && entry.swapGroupEnabled
      && !entry.swapGroupUsed
      && entry.hasValue
    ),
    dragTitle: entry.swapGroup
      ? game.i18n.localize("GINZZZU_C7PH.Creation.Characteristics.Swap.DragHint")
      : ""
  }));
}

export function prepareCharacteristicSwapGroups(application, rolls) {
  const complete = rolls.length > 0 && rolls.every((entry) => entry.hasValue);
  const draftObject = application._draft?.toObject?.() ?? {};
  const swaps = modelObject(
    application._draft?.characteristicSwaps,
    draftObject.characteristicSwaps ?? {}
  );

  return CharacteristicSwapService.groupIds.map((groupId) => {
    const state = CharacteristicSwapService.groupState(swaps, groupId);
    const statusKey = state.used
      ? "Used"
      : (state.enabled ? "Enabled" : "Disabled");

    return {
      canToggle: complete && !state.used,
      cssClass: `is-group-${groupId}`,
      enabled: state.enabled,
      id: groupId,
      label: game.i18n.localize(
        `GINZZZU_C7PH.Creation.Characteristics.Swap.Groups.${groupId}`
      ),
      status: game.i18n.localize(
        `GINZZZU_C7PH.Creation.Characteristics.Swap.Status.${statusKey}`
      ),
      used: state.used
    };
  });
}

export function characteristicsComplete(application) {
  if (CharacteristicPointService.isPointMethod(application._draft)) {
    return CharacteristicPointService.allocationState(application._draft).complete;
  }
  const definitions = prepareCharacteristicRolls(application);
  return definitions.length > 0
    && definitions.every((definition) => definition.hasValue);
}

export function canAdvance(application, state) {
  switch (application._draft.currentStep) {
    case CREATION_STEPS.SETUP:
      return state.setupSelected;
    case CREATION_STEPS.CHARACTERISTICS:
      return state.characteristicsComplete;
    case CREATION_STEPS.AGE:
      return state.ageComplete;
    case CREATION_STEPS.DERIVED:
      return state.derivedReady;
    case CREATION_STEPS.OCCUPATION:
      return state.occupationSelected;
    case CREATION_STEPS.OCCUPATION_SKILLS:
      return state.occupationSkillsComplete;
    case CREATION_STEPS.PERSONAL_INTERESTS:
      return state.personalInterestsComplete;
    case CREATION_STEPS.PERSONAL_DATA:
      return state.personalDataComplete;
    default:
      return true;
  }
}

export async function entryWarning(application, step) {
  const targetIndex = CREATION_STEP_ORDER.indexOf(step);
  const setupIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.SETUP);
  const characteristicsIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.CHARACTERISTICS);
  const ageIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.AGE);
  const derivedIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.DERIVED);
  const occupationIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.OCCUPATION);
  const occupationSkillsIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.OCCUPATION_SKILLS);
  const personalInterestsIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.PERSONAL_INTERESTS);
  const personalDataIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.PERSONAL_DATA);

  if (targetIndex > setupIndex && !application._draft.setup.uuid) {
    return "GINZZZU_C7PH.Creation.Warnings.SelectSetup";
  }
  if (targetIndex > characteristicsIndex && !characteristicsComplete(application)) {
    return "GINZZZU_C7PH.Creation.Warnings.RollCharacteristics";
  }
  if (targetIndex > ageIndex && !ageComplete(application)) {
    return "GINZZZU_C7PH.Creation.Warnings.CompleteAge";
  }
  if (targetIndex > derivedIndex && !prepareDerivedContext(application).derivedReady) {
    return "GINZZZU_C7PH.Creation.Warnings.ReviewDerived";
  }
  if (targetIndex > occupationIndex && !application._draft.occupation.uuid) {
    return "GINZZZU_C7PH.Creation.Warnings.SelectOccupation";
  }
  if (targetIndex > occupationSkillsIndex) {
    const context = await prepareOccupationSkillsContext(application);
    if (!context.occupationSkillsComplete) {
      return "GINZZZU_C7PH.Creation.Warnings.CompleteOccupationSkills";
    }
  }
  if (targetIndex > personalInterestsIndex) {
    const context = preparePersonalInterestsContext(application);
    if (!context.personalInterestsComplete) {
      return "GINZZZU_C7PH.Creation.Warnings.CompletePersonalInterests";
    }
  }
  if (targetIndex > personalDataIndex) {
    const context = preparePersonalDataContext(application);
    if (!context.personalDataComplete) {
      return "GINZZZU_C7PH.Creation.Warnings.CompletePersonalData";
    }
  }
  return null;
}

export async function buildWizardContext(application, baseContext = {}) {
  const sourceAvailable = Boolean(application._sources?.available);
  const stepIndex = Math.max(0, CREATION_STEP_ORDER.indexOf(application._draft.currentStep));
  const selectedOccupation = application._sources?.occupations.find((occupation) => (
    occupation.uuid === application._draft.occupation.uuid
  )) ?? (application._draft.occupation.uuid ? application._draft.occupation.toObject() : null);
  const normalizedQuery = application._occupationQuery
    .trim()
    .toLocaleLowerCase(game.i18n.lang);
  const occupations = (application._sources?.occupations ?? [])
    .filter((occupation) => (
      !normalizedQuery
      || occupation.name.toLocaleLowerCase(game.i18n.lang).includes(normalizedQuery)
    ))
    .map((occupation) => ({
      ...occupation,
      selected: occupation.uuid === application._draft.occupation.uuid
    }));

  const currentPresentation = CREATION_STEP_PRESENTATION[application._draft.currentStep];
  const selectedSetup = CreationSourceService.selectedSetup({
    draft: application._draft,
    sources: application._sources
  });
  const setupSelected = Boolean(application._draft.setup.uuid && selectedSetup);
  const occupationSelected = Boolean(application._draft.occupation.uuid);
  const characteristicRolls = prepareCharacteristicRolls(application);
  const characteristicSwapGroups = prepareCharacteristicSwapGroups(application, characteristicRolls);
  const pointState = CharacteristicPointService.allocationState(application._draft);
  const isPointMethod = CharacteristicPointService.isPointMethod(application._draft);
  const complete = isPointMethod
    ? pointState.complete
    : (characteristicRolls.length > 0 && characteristicRolls.every((entry) => entry.hasValue));
  const rolledCount = characteristicRolls.filter((entry) => entry.hasValue).length;
  const ageContext = prepareAgeContext(application);
  const derivedContext = prepareDerivedContext(application);
  const occupationSkillsContext = await prepareOccupationSkillsContext(application);
  const personalInterestsContext = preparePersonalInterestsContext(application);
  const personalDataContext = preparePersonalDataContext(application);
  const backstoryContext = prepareBackstoryContext(application);
  const reviewContext = application._draft.currentStep === CREATION_STEPS.REVIEW
    ? await prepareReviewContext(application)
    : {};
  const state = {
    ageComplete: ageContext.ageComplete,
    characteristicsComplete: complete,
    derivedReady: derivedContext.derivedReady,
    occupationSelected,
    occupationSkillsComplete: Boolean(occupationSkillsContext.occupationSkillsComplete),
    personalInterestsComplete: Boolean(personalInterestsContext.personalInterestsComplete),
    personalDataComplete: Boolean(personalDataContext.personalDataComplete),
    setupSelected
  };
  const defaultStepTitle = game.i18n.localize(currentPresentation?.label ?? "");
  let currentStepTitle = defaultStepTitle;
  if (application._draft.currentStep === CREATION_STEPS.OCCUPATION) {
    currentStepTitle = game.i18n.format("GINZZZU_C7PH.Creation.Occupation.StepTitle", {
      occupation: selectedOccupation?.name
        ?? game.i18n.localize("GINZZZU_C7PH.Creation.Occupation.Selection")
    });
  } else if (application._draft.currentStep === CREATION_STEPS.OCCUPATION_SKILLS) {
    currentStepTitle = game.i18n.format("GINZZZU_C7PH.Creation.Allocation.StepTitle", {
      occupation: selectedOccupation?.name ?? "—"
    });
  }

  const characteristicPointRows = POINT_BUY_CHARACTERISTIC_KEYS.map((key) => {
    const definition = selectedSetup?.characteristicFormulas?.find((entry) => entry.key === key);
    const value = pointState.values[key];
    const minimum = CharacteristicPointService.minimum(key);
    const maximum = CharacteristicPointService.maximum();
    return {
      canDecrease: Number.isInteger(value) && value > minimum,
      canIncrease: Number.isInteger(value) && value < maximum && pointState.remaining > 0,
      extremeValue: Number.isInteger(value) ? Math.floor(value / 5) : null,
      halfValue: Number.isInteger(value) ? Math.floor(value / 2) : null,
      key,
      label: definition?.label ?? game.i18n.localize(`CHARAC.${key.toUpperCase()}`),
      maximum,
      minimum,
      value
    };
  });
  const pointLuck = characteristicRolls.find((entry) => entry.key === "luck") ?? null;
  const setups = (application._sources?.setups ?? []).map((setup) => ({
    ...setup,
    methodLabel: game.i18n.localize(
      `GINZZZU_C7PH.Creation.Setup.Methods.${setup.characteristicMethod}`
    ),
    selected: setup.uuid === application._draft.setup.uuid
      || setup.cocid === application._draft.setup.cocid
  }));

  return {
    ...baseContext,
    ...ageContext,
    ...derivedContext,
    ...occupationSkillsContext,
    ...personalInterestsContext,
    ...personalDataContext,
    ...backstoryContext,
    ...reviewContext,
    canNext: sourceAvailable
      && canAdvance(application, state)
      && stepIndex < CREATION_STEP_ORDER.length - 1,
    canPrevious: stepIndex > 0,
    characteristicMethodPoints: isPointMethod,
    characteristicMethodRoll: !isPointMethod,
    characteristicPointBudget: pointState.budget,
    characteristicPointComplete: pointState.complete,
    characteristicPointRemaining: pointState.remaining,
    characteristicPointRows,
    characteristicPointsSpent: pointState.spent,
    characteristicRolls,
    characteristicRolledCount: rolledCount,
    characteristicSwapGroups,
    characteristicTotalCount: characteristicRolls.length,
    characteristicsComplete: complete,
    currentStep: application._draft.currentStep,
    currentStepHint: game.i18n.localize(
      `GINZZZU_C7PH.Creation.StepHints.${application._draft.currentStep}`
    ),
    currentStepIcon: currentPresentation?.icon ?? "fa-solid fa-user-plus",
    currentStepNumber: stepIndex + 1,
    currentStepTitle,
    draftHasOccupation: occupationSelected,
    draftHasSetup: setupSelected,
    hasUnrolledCharacteristics: rolledCount < characteristicRolls.length,
    occupationQuery: application._occupationQuery,
    occupations,
    occupationSources: application._sources?.occupationSources ?? [],
    occupationTotal: application._sources?.occupations.length ?? 0,
    occupationVisibleCount: occupations.length,
    pointLuck,
    selectedOccupation,
    selectedSetup,
    setups,
    showAge: application._draft.currentStep === CREATION_STEPS.AGE,
    showCharacteristics: application._draft.currentStep === CREATION_STEPS.CHARACTERISTICS,
    showDerived: application._draft.currentStep === CREATION_STEPS.DERIVED,
    showOccupation: application._draft.currentStep === CREATION_STEPS.OCCUPATION,
    showOccupationSkills: application._draft.currentStep === CREATION_STEPS.OCCUPATION_SKILLS,
    showPersonalData: application._draft.currentStep === CREATION_STEPS.PERSONAL_DATA,
    showPersonalInterests: application._draft.currentStep === CREATION_STEPS.PERSONAL_INTERESTS,
    showReview: application._draft.currentStep === CREATION_STEPS.REVIEW,
    showSetup: application._draft.currentStep === CREATION_STEPS.SETUP,
    skillColumns: ["Skill", "Base", "Personal", "Occupation", "Experience", "Total"]
      .map((key) => game.i18n.localize(`GINZZZU_C7PH.Creation.SkillColumns.${key}`)),
    sourceAvailable,
    sourceError: application._sources?.errorKey
      ? game.i18n.localize(application._sources.errorKey)
      : "",
    stepCount: CREATION_STEP_ORDER.length,
    steps: prepareSteps({application, state})
  };
}

function prepareSteps({application, state}) {
  const setupIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.SETUP);
  const characteristicsIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.CHARACTERISTICS);
  const ageIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.AGE);
  const derivedIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.DERIVED);
  const occupationIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.OCCUPATION);
  const occupationSkillsIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.OCCUPATION_SKILLS);
  const personalInterestsIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.PERSONAL_INTERESTS);
  const personalDataIndex = CREATION_STEP_ORDER.indexOf(CREATION_STEPS.PERSONAL_DATA);

  return CREATION_STEP_ORDER.map((id, index) => {
    const presentation = CREATION_STEP_PRESENTATION[id];
    const complete = (
      (id === CREATION_STEPS.SETUP && state.setupSelected)
      || (id === CREATION_STEPS.CHARACTERISTICS && state.characteristicsComplete)
      || (id === CREATION_STEPS.AGE && state.ageComplete)
      || (id === CREATION_STEPS.DERIVED && state.derivedReady)
      || (id === CREATION_STEPS.OCCUPATION && state.occupationSelected)
      || (id === CREATION_STEPS.OCCUPATION_SKILLS && state.occupationSkillsComplete)
      || (id === CREATION_STEPS.PERSONAL_INTERESTS && state.personalInterestsComplete)
      || (id === CREATION_STEPS.PERSONAL_DATA && state.personalDataComplete)
    );
    const locked = (
      (index > setupIndex && !state.setupSelected)
      || (index > characteristicsIndex && !state.characteristicsComplete)
      || (index > ageIndex && !state.ageComplete)
      || (index > derivedIndex && !state.derivedReady)
      || (index > occupationIndex && !state.occupationSelected)
      || (index > occupationSkillsIndex && !state.occupationSkillsComplete)
      || (index > personalInterestsIndex && !state.personalInterestsComplete)
      || (index > personalDataIndex && !state.personalDataComplete)
    );

    return {
      active: id === application._draft.currentStep,
      complete,
      icon: presentation.icon,
      id,
      label: game.i18n.localize(presentation.label),
      locked,
      number: index + 1
    };
  });
}
