import {
  CREATION_PROGRESS_STATUSES,
  CREATION_STEP_ORDER,
  CREATION_STEP_PRESENTATION,
  CREATION_STEPS
} from "../../creation/constants.js";
import { CreationCompletionService } from "../../creation/services/creation-completion-service.js";
import { CreationProgressService } from "../../creation/services/creation-progress-service.js";

const STATUS_PRESENTATION = Object.freeze({
  completed: Object.freeze({className: "is-completed", icon: "fa-circle-check"}),
  inProgress: Object.freeze({className: "is-progress", icon: "fa-pen-to-square"}),
  notStarted: Object.freeze({className: "is-not-started", icon: "fa-circle-minus"}),
  ready: Object.freeze({className: "is-ready", icon: "fa-circle-check"})
});

function statusLabel(status) {
  return game.i18n.localize(`GINZZZU_C7PH.Keeper.Status.${status}`);
}

function stepLabel(step) {
  const key = CREATION_STEP_PRESENTATION[step]?.label;
  return key ? game.i18n.localize(key) : "—";
}

function formatUpdatedAt(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "—";
  return new Intl.DateTimeFormat(game.i18n.lang, {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function nonNegativeInteger(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function playerUsers() {
  return (game.users?.contents ?? [])
    .filter((user) => !user.isGM && user.character?.type === "character")
    .sort((left, right) => left.name.localeCompare(right.name, game.i18n.lang));
}

function notStartedState(user) {
  return {
    actorId: user.character.id,
    actorName: user.character.name,
    completedCount: 0,
    completedSteps: [],
    currentStep: null,
    currentStepLabel: game.i18n.localize("GINZZZU_C7PH.Keeper.NotStartedStep"),
    draft: null,
    investigatorName: "",
    issues: [],
    occupationName: "",
    occupationPoints: {spent: 0, total: 0},
    personalPoints: {spent: 0, total: 0},
    status: "notStarted",
    updatedAt: 0,
    userActive: Boolean(user.active),
    userId: user.id,
    userName: user.name
  };
}

function actorSkillPoints(actor, field) {
  return [...(actor.items ?? [])]
    .filter((item) => item.type === "skill")
    .reduce((total, item) => (
      total + nonNegativeInteger(item.system?.adjustments?.[field])
    ), 0);
}

function inferredCompletedState(user) {
  const actor = user.character;
  const occupationSpent = actorSkillPoints(actor, "occupation");
  const personalSpent = actorSkillPoints(actor, "personal");
  const occupationTotal = nonNegativeInteger(
    actor.system?.development?.occupation || occupationSpent
  );
  const personalTotal = nonNegativeInteger(
    actor.system?.development?.personal || personalSpent
  );
  return {
    actorId: actor.id,
    actorName: actor.name,
    completedCount: CREATION_STEP_ORDER.length,
    completedSteps: [...CREATION_STEP_ORDER],
    currentStep: CREATION_STEPS.REVIEW,
    currentStepLabel: stepLabel(CREATION_STEPS.REVIEW),
    draft: null,
    investigatorName: String(actor.name ?? "").trim(),
    issues: [],
    occupationName: String(actor.system?.infos?.occupation ?? "").trim(),
    occupationPoints: {spent: occupationSpent, total: occupationTotal},
    personalPoints: {spent: personalSpent, total: personalTotal},
    status: CREATION_PROGRESS_STATUSES.COMPLETED,
    updatedAt: 0,
    userActive: Boolean(user.active),
    userId: user.id,
    userName: user.name
  };
}

function snapshotState(user, snapshot) {
  const source = snapshot.toObject();
  return {
    actorId: user.character.id,
    actorName: user.character.name,
    completedCount: source.completedSteps.length,
    completedSteps: source.completedSteps,
    currentStep: source.currentStep,
    currentStepLabel: stepLabel(source.currentStep),
    draft: foundry.utils.deepClone(source.draft ?? {}),
    investigatorName: source.investigatorName,
    issues: source.issues.map((entry) => ({
      label: game.i18n.localize(entry.key),
      step: entry.step,
      stepLabel: stepLabel(entry.step)
    })),
    occupationName: source.occupationName,
    occupationPoints: source.occupationPoints,
    personalPoints: source.personalPoints,
    status: source.status,
    updatedAt: source.updatedAt,
    userActive: Boolean(user.active),
    userId: user.id,
    userName: user.name
  };
}

function decoratePlayer(state, selectedUserId) {
  const presentation = STATUS_PRESENTATION[state.status] ?? STATUS_PRESENTATION.notStarted;
  const currentIndex = state.currentStep
    ? CREATION_STEP_ORDER.indexOf(state.currentStep)
    : -1;
  return {
    ...state,
    activeClass: state.userActive ? "is-online" : "is-offline",
    currentStepNumber: currentIndex >= 0 ? currentIndex + 1 : 0,
    isSelected: state.userId === selectedUserId,
    lastUpdated: formatUpdatedAt(state.updatedAt),
    progressLabel: state.status === CREATION_PROGRESS_STATUSES.COMPLETED
      ? game.i18n.localize("GINZZZU_C7PH.Keeper.CompletedProgress")
      : game.i18n.format("GINZZZU_C7PH.Keeper.StepProgress", {
        current: currentIndex >= 0 ? currentIndex + 1 : 0,
        total: CREATION_STEP_ORDER.length
      }),
    statusClass: presentation.className,
    statusIcon: presentation.icon,
    statusLabel: statusLabel(state.status),
    stepTotal: CREATION_STEP_ORDER.length
  };
}

function stepRows(player) {
  const completed = new Set(player.completedSteps);
  return CREATION_STEP_ORDER.map((step, index) => {
    const isActive = player.currentStep === step
      && player.status !== CREATION_PROGRESS_STATUSES.COMPLETED;
    const isComplete = completed.has(step);
    return {
      className: isComplete ? "is-complete" : (isActive ? "is-active" : "is-pending"),
      icon: isComplete ? "fa-check" : (isActive ? "fa-pen" : "fa-circle"),
      label: stepLabel(step),
      number: index + 1
    };
  });
}

export class KeeperProgressService {
  static players(selectedUserId = null) {
    const states = playerUsers().map((user) => {
      const snapshot = CreationProgressService.load(user.character, {userId: user.id});
      if (snapshot?.status === CREATION_PROGRESS_STATUSES.COMPLETED) {
        return snapshotState(user, snapshot);
      }
      if (CreationCompletionService.isCompletedActor(user.character)) {
        return inferredCompletedState(user);
      }
      if (snapshot) return snapshotState(user, snapshot);
      return notStartedState(user);
    });
    const resolvedId = states.some((entry) => entry.userId === selectedUserId)
      ? selectedUserId
      : (states[0]?.userId ?? null);
    return {
      players: states.map((state) => decoratePlayer(state, resolvedId)),
      selectedUserId: resolvedId
    };
  }

  static context(selectedUserId = null) {
    const {players, selectedUserId: resolvedId} = this.players(selectedUserId);
    const selected = players.find((entry) => entry.userId === resolvedId) ?? null;
    return {
      players,
      selected: selected ? {
        ...selected,
        hasIssues: selected.issues.length > 0,
        hasOccupationPool: selected.occupationPoints.total > 0,
        hasPersonalPool: selected.personalPoints.total > 0,
        isNotStarted: selected.status === "notStarted",
        steps: stepRows(selected)
      } : null,
      selectedUserId: resolvedId
    };
  }
}
