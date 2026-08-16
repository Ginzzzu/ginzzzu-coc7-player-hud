import { MODULE_ID } from "../../constants.js";
import {
  CREATION_DRAFT_FLAG,
  CREATION_PROGRESS_STATUSES
} from "../constants.js";
import { CreationCompletionService } from "./creation-completion-service.js";
import { CreationProgressService } from "./creation-progress-service.js";

export class CreationAccessService {
  static resolve(user = game.user) {
    const actor = user?.character ?? null;
    const actorSnapshot = actor ? CreationProgressService.load(actor) : null;
    const snapshot = actorSnapshot?.userId === user?.id ? actorSnapshot : null;
    const hasDraft = Boolean(user?.getFlag?.(MODULE_ID, CREATION_DRAFT_FLAG));
    const inferredCompleted = CreationCompletionService.isCompletedActor(actor);
    const completed = snapshot?.status === CREATION_PROGRESS_STATUSES.COMPLETED
      || inferredCompleted;
    const resumable = !completed && Boolean(
      snapshot?.status === CREATION_PROGRESS_STATUSES.IN_PROGRESS
      || snapshot?.status === CREATION_PROGRESS_STATUSES.READY
    );

    return {
      actor,
      canOpen: !completed,
      completed,
      hasDraft,
      inferredCompleted,
      resumable,
      showAction: !completed,
      snapshot
    };
  }
}
