function isValidFormula(value) {
  const formula = String(value ?? "").trim();
  if (!formula) return false;

  try {
    return Roll.validate(formula);
  } catch (_error) {
    return false;
  }
}

function validPrefix(value) {
  const text = String(value ?? "").trim().replaceAll(",", ".");
  if (isValidFormula(text)) return text;

  const fragments = text.match(/[0-9dD+\-*/().\s]+/g) ?? [];
  for (const rawFragment of fragments) {
    const fragment = rawFragment.trim();
    for (let end = fragment.length; end > 0; end -= 1) {
      const candidate = fragment.slice(0, end).trim();
      if (isValidFormula(candidate)) return candidate;
    }
  }

  return "";
}

/**
 * Repair legacy or descriptive uses-per-round values before CoC7 evaluates them
 * as Foundry Roll formulas while building its native combat card.
 */
export class WeaponAttackService {
  static async prepare(weapon) {
    if (!weapon || weapon.type !== "weapon") throw new Error("A weapon Item is required");

    const normalSource = weapon.system?.usesPerRound?.normal;
    const normal = validPrefix(normalSource) || "1";
    const maxSource = weapon.system?.usesPerRound?.max;
    const max = validPrefix(maxSource) || normal;
    const updates = {};

    if (String(normalSource ?? "").trim() !== normal) {
      updates["system.usesPerRound.normal"] = normal;
    }
    if (String(maxSource ?? "").trim() !== max) {
      updates["system.usesPerRound.max"] = max;
    }

    if (Object.keys(updates).length > 0) {
      console.warn(
        "ginzzzu-coc7-player-hud | Normalized invalid weapon uses-per-round formulas before native CoC7 attack",
        {weapon: weapon.name, updates}
      );
      await weapon.update(updates);
    }

    return weapon;
  }
}
