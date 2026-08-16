import { KeeperProgressService } from "../services/keeper-progress-service.js";
import { buildKeeperReviewContext } from "./keeper-review-context.js";

export function buildKeeperMonitorContext(application, baseContext = {}) {
  const progress = KeeperProgressService.context(application._selectedUserId);
  application._selectedUserId = progress.selectedUserId;
  const selected = progress.selected
    ? {
      ...progress.selected,
      review: buildKeeperReviewContext(progress.selected)
    }
    : null;

  return {
    ...baseContext,
    ...progress,
    selected,
    hasPlayers: progress.players.length > 0,
    playerCount: progress.players.length
  };
}
