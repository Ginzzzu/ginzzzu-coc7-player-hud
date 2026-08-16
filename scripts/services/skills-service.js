import { SKILL_VIEWS } from "../constants.js";

export class SkillsService {
  static build(actor, {
    favoriteSkillUuids = [],
    query = "",
    recentSkillUuids = [],
    view = SKILL_VIEWS.ALL
  } = {}) {
    if (!actor) return this.#empty();

    const favorites = new Set(favoriteSkillUuids);
    const recentOrder = new Map(recentSkillUuids.map((uuid, index) => [uuid, index]));
    const normalizedQuery = query.trim().toLocaleLowerCase(game.i18n.lang);
    const all = [...actor.items]
      .filter((item) => item.type === "skill")
      .map((item) => ({
        favorite: favorites.has(item.uuid),
        id: item.id,
        name: item.name,
        occupation: Boolean(item.system?.flags?.occupation),
        recentIndex: recentOrder.get(item.uuid) ?? null,
        uuid: item.uuid,
        value: this.#number(item.system?.value)
      }));

    const favoriteCount = all.filter((skill) => skill.favorite).length;
    const occupationCount = all.filter((skill) => skill.occupation).length;
    const recentCount = all.filter((skill) => skill.recentIndex !== null).length;
    let visible = all;

    if (view === SKILL_VIEWS.OCCUPATION) {
      visible = visible.filter((skill) => skill.occupation);
    } else if (view === SKILL_VIEWS.FAVORITES) {
      visible = visible.filter((skill) => skill.favorite);
    } else if (view === SKILL_VIEWS.RECENT) {
      visible = visible.filter((skill) => skill.recentIndex !== null);
    }

    if (normalizedQuery) {
      visible = visible.filter((skill) => skill.name
        .toLocaleLowerCase(game.i18n.lang)
        .includes(normalizedQuery));
    }

    visible.sort(view === SKILL_VIEWS.RECENT
      ? (left, right) => left.recentIndex - right.recentIndex
      : (left, right) => left.name.localeCompare(right.name, game.i18n.lang));

    return {
      favoriteCount,
      hasAny: all.length > 0,
      hasVisible: visible.length > 0,
      occupationCount,
      recentCount,
      skills: visible,
      totalCount: all.length
    };
  }

  static #empty() {
    return {
      favoriteCount: 0,
      hasAny: false,
      hasVisible: false,
      occupationCount: 0,
      recentCount: 0,
      skills: [],
      totalCount: 0
    };
  }

  static #number(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
}
