const CHARACTERISTICS = Object.freeze([
  Object.freeze({key: "str", label: "CHARAC.Strength"}),
  Object.freeze({key: "con", label: "CHARAC.Constitution"}),
  Object.freeze({key: "siz", label: "CHARAC.Size"}),
  Object.freeze({key: "dex", label: "CHARAC.Dexterity"}),
  Object.freeze({key: "app", label: "CHARAC.Appearance"}),
  Object.freeze({key: "int", label: "CHARAC.Intelligence"}),
  Object.freeze({key: "pow", label: "CHARAC.Power"}),
  Object.freeze({key: "edu", label: "CHARAC.Education"})
]);

export class CharacteristicsService {
  static build(actor) {
    if (!actor) return [];

    return CHARACTERISTICS.map((definition) => ({
      key: definition.key,
      label: game.i18n.localize(definition.label),
      value: this.#number(actor.system?.characteristics?.[definition.key]?.value)
    }));
  }

  static has(key) {
    return CHARACTERISTICS.some((definition) => definition.key === key);
  }

  static #number(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
}
