import { MODULE_ID, SYSTEM_ID } from "../constants.js";
import { ActorResolverService } from "../services/actor-resolver-service.js";
import { ActionRequestService } from "./action-request-service.js";
import { PendingRequestService } from "./pending-request-service.js";

const PROVIDER_ID = `${MODULE_ID}.coc7`;
const DASHBOARD_MODULE_ID = "ginzzzu-gm-dashboard";
const READY_HOOK = `${DASHBOARD_MODULE_ID}.interactionsReady`;
let registeredApi = null;
const openedRequestIds = new Set();
const MODIFIER_OPTIONS = Object.freeze([
  {value: 2, key: "TwoBonus"},
  {value: 1, key: "OneBonus"},
  {value: 0, key: "None"},
  {value: -1, key: "OnePenalty"},
  {value: -2, key: "TwoPenalty"}
]);

function targetActor(userId) {
  const user = game.users?.get(userId);
  return user?.character ?? null;
}

function buildParameters(parameters = {}) {
  const difficulty = ["regular", "hard", "extreme"].includes(parameters.difficulty)
    ? parameters.difficulty
    : "regular";
  const modifier = Math.max(-2, Math.min(2, Number(parameters.modifier) || 0));
  return {difficulty, modifier, locked: parameters.locked === true || parameters.locked === "true"};
}

function modifierPresentation(value) {
  const modifier = Math.max(-2, Math.min(2, Number(value) || 0));
  const modifierKey = {
    "-2": "TwoPenalty",
    "-1": "OnePenalty",
    0: "None",
    1: "OneBonus",
    2: "TwoBonus"
  }[modifier];
  return game.i18n.localize(`GINZZZU_C7PH.Sections.Requests.Modifiers.${modifierKey}`);
}

function modifierOptions(value = 0) {
  const current = Math.max(-2, Math.min(2, Number(value) || 0));
  return MODIFIER_OPTIONS.map((entry) => ({
    label: game.i18n.localize(`GINZZZU_C7PH.Sections.Requests.Modifiers.${entry.key}`),
    selected: entry.value === current,
    value: String(entry.value)
  }));
}

function parameterPresentation(parameters = {}) {
  const normalized = buildParameters(parameters);
  const difficultyKey = {
    regular: "Regular",
    hard: "Hard",
    extreme: "Extreme"
  }[normalized.difficulty];
  return {
    ...normalized,
    difficultyLabel: game.i18n.localize(`GINZZZU_C7PH.Sections.Requests.Difficulties.${difficultyKey}`),
    modifierLabel: modifierPresentation(normalized.modifier),
    lockedLabel: normalized.locked
      ? game.i18n.localize("GINZZZU_C7PH.Sections.Requests.ParametersLocked")
      : ""
  };
}

export const Coc7InteractionProvider = Object.freeze({
  id: PROVIDER_ID,
  systemId: SYSTEM_ID,
  label: "GINZZZU_C7PH.Sections.Requests.ProviderLabel",
  capabilities: Object.freeze(["action-request", "check-request", "combined-check-request"]),
  defaultCapability: "check-request",

  async buildComposer({targetUserId, category = "all", query = ""} = {}) {
    const actor = targetActor(targetUserId);
    const catalog = ActionRequestService.build(actor, {category, query, includeAllAvailable: true});
    return {
      providerId: PROVIDER_ID,
      providerLabel: game.i18n.localize(this.label),
      targetUserId,
      actorName: actor?.name ?? "",
      categories: catalog.categories,
      activeCategory: catalog.activeCategory,
      entries: catalog.entries,
      hasEntries: catalog.hasEntries,
      combined: {
        characteristics: ["str", "con", "siz", "dex", "app", "int", "pow", "edu"]
          .map((key) => ActionRequestService.describeCharacteristic(actor, key))
          .filter(Boolean),
        minimumSelections: 2,
        modifierLabel: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Modifier"),
        modifierOptions: modifierOptions(),
        supported: true,
        operators: [
          {value: "all", label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Combined.All")},
          {value: "any", label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Combined.Any")}
        ]
      },
      controls: [
        {
          id: "locked",
          label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.LockParameters"),
          type: "toggle",
          isToggle: true,
          checked: false
        },
        {
          id: "difficulty",
          label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Difficulty"),
          type: "choice",
          isChoice: true,
          options: [
            {value: "regular", label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Difficulties.Regular"), selected: true},
            {value: "hard", label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Difficulties.Hard")},
            {value: "extreme", label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Difficulties.Extreme")}
          ]
        },
        {
          id: "modifier",
          label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Modifier"),
          singleOnly: true,
          type: "choice",
          isChoice: true,
          options: [
            {value: "-2", label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Modifiers.TwoPenalty")},
            {value: "-1", label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Modifiers.OnePenalty")},
            {value: "0", label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Modifiers.None"), selected: true},
            {value: "1", label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Modifiers.OneBonus")},
            {value: "2", label: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Modifiers.TwoBonus")}
          ]
        }
      ]
    };
  },

  async createRequestPayload({targetUserId, actionId, checks = [], selections = [], operator = "all", parameters = {}} = {}) {
    const actor = targetActor(targetUserId);
    const directChecks = (Array.isArray(checks) ? checks : []).map((check) => ({
      ...check,
      poolModifier: check?.modifierValue ?? check?.poolModifier
    }));
    const selectedActions = Array.isArray(selections) ? selections : [];
    const directResolved = ActionRequestService.normalizeChecks(actor, directChecks);
    const actionResolved = selectedActions
      .map((selection) => {
        const check = ActionRequestService.describeCheck(actor, selection?.actionId, {skillId: selection?.skillId ?? null});
        return check ? {...check, poolModifier: selection?.modifierValue ?? selection?.poolModifier} : null;
      })
      .filter(Boolean);
    const requestedChecks = [...new Map(
      [...directResolved, ...actionResolved].map((check) => [check.identity, check])
    ).values()];

    if (requestedChecks.length >= 2) {
      return {
        type: "combined",
        checks: ActionRequestService.serializeChecks(requestedChecks),
        operator: operator === "any" ? "any" : "all",
        actionLabel: game.i18n.localize("GINZZZU_C7PH.Sections.Requests.Combined.Title"),
        parameters: buildParameters(parameters)
      };
    }

    if ((directChecks.length || selectedActions.length) && !actionId) {
      throw new Error("A combined request requires at least two available checks");
    }

    const action = ActionRequestService.resolve(actor, actionId);
    return {
      type: "single",
      actionId,
      actionLabel: action?.label ?? actionId,
      parameters: buildParameters(parameters)
    };
  },

  async receiveRequest(request) {
    if (game.user?.id !== request?.targetUserId) return false;
    const received = PendingRequestService.receive(request);
    if (!received) return false;
    const application = game.modules.get(MODULE_ID)?.api?.application;
    if (application) {
      application._suppressShelfAnimation = true;
      await application.refreshFromHook();
    }
    return true;
  },

  async cancelRequest(request) {
    if (game.user?.id !== request?.targetUserId) return false;
    const removed = PendingRequestService.cancel(request.requestId);
    openedRequestIds.delete(request.requestId);
    const application = game.modules.get(MODULE_ID)?.api?.application;
    if (removed && application) await application.refreshFromHook();
    return removed;
  },

  async markIncomingOpened() {
    for (const request of PendingRequestService.list()) {
      if (openedRequestIds.has(request.requestId)) continue;
      openedRequestIds.add(request.requestId);
      await PendingRequestService.status(request.requestId, "opened");
    }
  },

  async dismissIncoming(requestId) {
    const request = PendingRequestService.list().find((entry) => entry.requestId === requestId);
    if (!request) return false;
    await PendingRequestService.status(requestId, "dismissed");
    openedRequestIds.delete(requestId);
    return PendingRequestService.complete(requestId);
  },

  async executeIncoming(requestId, {skillId = null, combinedModifiers = []} = {}) {
    const request = PendingRequestService.list().find((entry) => entry.requestId === requestId);
    if (!request) throw new Error(`Interaction request not found: ${requestId}`);
    const actor = ActorResolverService.resolve().actor;
    if (!actor) throw new Error("An assigned investigator is required");
    if (request.payload?.type === "combined") {
      const parameters = buildParameters(request.payload?.parameters ?? {});
      const sourceChecks = Array.isArray(request.payload?.checks) ? request.payload.checks : [];
      const modifierByIdentity = new Map((Array.isArray(combinedModifiers) ? combinedModifiers : [])
        .filter((entry) => entry?.identity)
        .map((entry) => [entry.identity, Math.max(-2, Math.min(2, Number(entry.poolModifier) || 0))]));
      const checks = parameters.locked
        ? sourceChecks
        : sourceChecks.map((check) => {
            const identity = check?.type === "skill"
              ? `skill:${check?.itemId ?? ""}`
              : `${check?.type ?? "check"}:${check?.key ?? ""}`;
            return {
              ...check,
              poolModifier: modifierByIdentity.has(identity)
                ? modifierByIdentity.get(identity)
                : Math.max(-2, Math.min(2, Number(check?.poolModifier) || 0))
            };
          });
      await ActionRequestService.executeCombined(actor, checks, {
        operator: request.payload?.operator ?? "all",
        parameters
      });
    } else {
      await ActionRequestService.execute(actor, request.payload?.actionId, {
        skillId,
        parameters: request.payload?.parameters ?? {}
      });
    }
    await PendingRequestService.status(requestId, "completed");
    PendingRequestService.complete(requestId);
    openedRequestIds.delete(requestId);
  },

  getIncomingRequests() {
    const actor = ActorResolverService.resolve().actor;
    return PendingRequestService.list().map((request) => {
      if (request.payload?.type === "combined") {
        const checks = ActionRequestService.normalizeChecks(actor, request.payload?.checks ?? []).map((check) => ({
          ...check,
          modifierLabel: modifierPresentation(check.poolModifier),
          modifierOptions: modifierOptions(check.poolModifier)
        }));
        const operator = request.payload?.operator === "any" ? "any" : "all";
        return {
          ...request,
          combined: true,
          checks,
          operator,
          operatorLabel: game.i18n.localize(
            operator === "any"
              ? "GINZZZU_C7PH.Sections.Requests.Combined.AnyCondition"
              : "GINZZZU_C7PH.Sections.Requests.Combined.AllCondition"
          ),
          parameters: parameterPresentation(request.payload?.parameters),
          available: checks.length >= 2,
          choices: []
        };
      }

      const action = ActionRequestService.resolve(actor, request.payload?.actionId);
      return {
        ...request,
        combined: false,
        action,
        parameters: parameterPresentation(request.payload?.parameters),
        available: Boolean(action?.available),
        choices: action?.choices ?? []
      };
    });
  }
});

function registerWithDashboard(api) {
  if (!api?.registerProvider || registeredApi === api) return false;
  api.registerProvider(Coc7InteractionProvider);
  PendingRequestService.configure({
    sendStatus: (request, status) => api.sendStatus?.(request, status)
  });
  registeredApi = api;
  return true;
}

export function registerCoc7InteractionProvider() {
  Hooks.on(READY_HOOK, (api) => {
    try {
      registerWithDashboard(api);
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to register interaction provider from hook`, error);
    }
  });
}

export function connectCoc7InteractionProvider() {
  const api = game.modules.get(DASHBOARD_MODULE_ID)?.api?.interactions;
  return registerWithDashboard(api);
}
