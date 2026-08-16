export class ActorResolverService {
  static resolve() {
    const user = game.user;
    const assigned = user?.character ?? null;

    if (assigned?.type === "character") {
      if (assigned.isOwner) {
        return {
          actor: assigned,
          candidates: [assigned],
          reason: null,
          source: "assigned"
        };
      }

      return {
        actor: null,
        candidates: [],
        reason: "noPermission",
        source: "assigned"
      };
    }

    const candidates = game.actors
      .filter((actor) => actor.type === "character" && actor.isOwner)
      .sort((left, right) => left.name.localeCompare(right.name, game.i18n.lang));

    if (candidates.length === 1) {
      return {
        actor: candidates[0],
        candidates,
        reason: null,
        source: "singleOwned"
      };
    }

    return {
      actor: null,
      candidates,
      reason: candidates.length > 1 ? "multipleOwned" : "unassigned",
      source: null
    };
  }

  static isRelevant(actor) {
    if (actor?.type !== "character") return false;

    const resolution = this.resolve();
    if (resolution.actor?.id === actor.id) return true;
    if (game.user?.character) return false;

    return actor.isOwner;
  }
}
