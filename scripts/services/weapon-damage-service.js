function normalizeFormulaPart(value) {
  return (value ?? "").toString().trim().replace(/\s+/g, "");
}

function appendModifier(formula, modifier) {
  const normalized = normalizeFormulaPart(modifier);
  if (!normalized || normalized === "0") return formula;
  return `${formula}${normalized.startsWith("+") || normalized.startsWith("-") ? "" : "+"}${normalized}`;
}

function halfDamageBonus(damageBonus) {
  let formula = normalizeFormulaPart(damageBonus) || "0";
  if (!formula.startsWith("-") && !formula.startsWith("+")) formula = `+${formula}`;

  const values = [...formula.matchAll(/([+-])(\d+)(d(\d+))?/gi)];
  let lastPosition = 0;
  for (const value of values) {
    const found = formula.indexOf(value[0], lastPosition);
    if (found < 0) continue;

    const sign = value[1];
    const amount = Number(value[2]);
    const dieFaces = value[4] === undefined ? null : Number(value[4]);
    const halved = dieFaces === null
      ? (sign === "-" ? Math.ceil(amount / 2) : Math.floor(amount / 2)).toString()
      : `${amount}D${sign === "-" ? Math.ceil(dieFaces / 2) : Math.floor(dieFaces / 2)}`;
    const replacement = `${sign}${halved}`;

    formula = formula.slice(0, found) + replacement + formula.slice(found + value[0].length);
    lastPosition = found + replacement.length;
  }

  return formula;
}

export class WeaponDamageService {
  static buildFormula(actor, weapon, rangeKey = "normal") {
    let formula = normalizeFormulaPart(weapon?.system?.range?.[rangeKey]?.damage);
    if (!formula) return "";

    const properties = weapon.system?.properties ?? {};
    const damageBonus = actor?.system?.attribs?.db?.value;
    if (properties.addb) formula = appendModifier(formula, damageBonus);
    else if (properties.ahdb) formula = appendModifier(formula, halfDamageBonus(damageBonus));

    return formula;
  }

  static async roll(actor, weapon, rangeKey = "normal") {
    if (!actor?.isOwner) throw new Error("An owned investigator is required");
    if (!weapon || weapon.type !== "weapon" || weapon.parent?.id !== actor.id) {
      throw new Error("An embedded weapon is required");
    }

    const formula = this.buildFormula(actor, weapon, rangeKey);
    if (!formula || !Roll.validate(formula)) {
      ui.notifications.warn(game.i18n.format(
        "GINZZZU_C7PH.Sections.Combat.InvalidDamageFormula",
        {weapon: weapon.name}
      ));
      return null;
    }

    const roll = await new Roll(formula, actor.parsedValues?.() ?? {}).roll();
    await roll.toMessage({
      flavor: game.i18n.format("GINZZZU_C7PH.Sections.Combat.DamageRollMessage", {
        weapon: weapon.name
      }),
      speaker: ChatMessage.getSpeaker({actor})
    });
    return roll;
  }
}
