const DICE_SIDES = Object.freeze([3, 4, 6, 8, 10, 12, 20, 100]);
const DICE_ICONS = Object.freeze({
  3: "fa-solid fa-dice",
  4: "fa-solid fa-dice-d4",
  6: "fa-solid fa-dice-d6",
  8: "fa-solid fa-dice-d8",
  10: "fa-solid fa-dice-d10",
  12: "fa-solid fa-dice-d12",
  20: "fa-solid fa-dice-d20",
  100: "fa-solid fa-dice-d10"
});
const ALLOWED_FORMULAS = new Set(DICE_SIDES.map((sides) => `1d${sides}`));
const PUBLIC_ROLL_MODE = "roll";

export class GenericDiceRollService {
  static build() {
    return DICE_SIDES.map((sides) => {
      const formula = `1d${sides}`;
      return {
        formula,
        label: `d${sides}`,
        icon: DICE_ICONS[sides],
        title: game.i18n.format("GINZZZU_C7PH.Sections.Dice.RollHint", {formula})
      };
    });
  }

  static async roll(actor, formula) {
    if (!ALLOWED_FORMULAS.has(formula)) {
      throw new Error(`Unsupported generic dice formula: ${formula}`);
    }

    const roll = await new Roll(formula).evaluate();
    const speaker = ChatMessage.getSpeaker(actor ? {actor} : {});

    return roll.toMessage({
      flavor: game.i18n.format("GINZZZU_C7PH.Sections.Dice.RollFlavor", {formula}),
      speaker
    }, {
      rollMode: PUBLIC_ROLL_MODE
    });
  }
}
