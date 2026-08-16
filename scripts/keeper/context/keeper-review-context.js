import { CREATION_PROGRESS_STATUSES } from "../../creation/constants.js";
import { buildReviewSummaryContext } from "../../creation/context/review-summary-context.js";
import { buildKeeperActorReviewContext } from "./keeper-actor-review-context.js";

function hasDraftContent(source) {
  return Boolean(
    source
    && typeof source === "object"
    && Object.keys(source).length > 0
  );
}

function draftReview(player) {
  return {
    available: true,
    ...buildReviewSummaryContext({
      occupationPoints: player.occupationPoints,
      personalPoints: player.personalPoints,
      source: player.draft
    }),
    reviewBackstoryEmpty: game.i18n.localize("GINZZZU_C7PH.Creation.Review.BackstoryEmpty"),
    reviewCharacteristicsEmpty: game.i18n.localize("GINZZZU_C7PH.Keeper.Review.CharacteristicsEmpty"),
    reviewDerivedEmpty: game.i18n.localize("GINZZZU_C7PH.Keeper.Review.DerivedEmpty"),
    reviewEyebrow: game.i18n.localize("GINZZZU_C7PH.Keeper.Review.DraftEyebrow"),
    reviewIsPartial: false,
    reviewSkillsEmpty: game.i18n.localize("GINZZZU_C7PH.Keeper.Review.SkillsEmpty"),
    reviewTitle: game.i18n.localize("GINZZZU_C7PH.Keeper.Review.DraftTitle")
  };
}

function assignedActor(player) {
  const actorId = String(player?.actorId ?? "");
  if (!actorId) return null;

  const actor = game.actors?.get(actorId) ?? null;
  const current = game.users?.get(player?.userId)?.character ?? null;
  if (current?.id === actorId) return current;
  return actor;
}

export function buildKeeperReviewContext(player) {
  if (hasDraftContent(player?.draft)) return draftReview(player);

  if (player?.status === CREATION_PROGRESS_STATUSES.COMPLETED) {
    return buildKeeperActorReviewContext(assignedActor(player));
  }

  return {available: false};
}
