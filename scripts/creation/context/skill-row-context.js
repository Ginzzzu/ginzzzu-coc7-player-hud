const CREDIT_COCID = "i.skill.credit-rating";
const SKILL_TOTAL_WARNING_THRESHOLD = 100;

export function occupationSkillSourcePresentation(skill) {
  const slotId = String(skill.slotId ?? "");
  if (skill.cocid === CREDIT_COCID) {
    return {
      className: "is-credit",
      label: game.i18n.localize("GINZZZU_C7PH.Creation.Allocation.CreditSkill"),
      rank: 0
    };
  }
  if (slotId.startsWith("required:")) {
    return {
      className: "is-required",
      label: game.i18n.localize("GINZZZU_C7PH.Creation.Allocation.RequiredSkillShort"),
      rank: 10
    };
  }
  if (slotId.startsWith("group:")) {
    const groupIndex = Number.parseInt(slotId.split(":")[1], 10);
    const number = Number.isFinite(groupIndex) ? groupIndex + 1 : 1;
    return {
      className: "is-group",
      label: game.i18n.format("GINZZZU_C7PH.Creation.Allocation.GroupSkill", {number}),
      rank: 20 + number
    };
  }
  if (slotId.startsWith("personal:")) {
    return {
      className: "is-free",
      label: game.i18n.localize("GINZZZU_C7PH.Creation.Allocation.FreeSkill"),
      rank: 100
    };
  }
  return {
    className: "",
    label: game.i18n.localize("GINZZZU_C7PH.Creation.Allocation.OccupationSkill"),
    rank: 90
  };
}

export function skillNameFieldPresentation(skill) {
  const cocid = String(skill?.sourceCocid ?? skill?.cocid ?? "").toLowerCase();
  const name = String(skill?.name ?? "").toLowerCase();

  if (cocid.includes("i.skill.language-own") || (isLanguageName(name) && isOwnName(name))) {
    return localizedField("OwnLanguageName", "OwnLanguagePlaceholder");
  }
  if (cocid.includes("i.skill.language-any") || isLanguageName(name)) {
    return localizedField("LanguageName", "LanguagePlaceholder");
  }
  if (cocid.includes("i.skill.art-craft-any") || isArtCraftName(name)) {
    return localizedField("ArtCraftName", "ArtCraftPlaceholder");
  }
  if (cocid.includes("i.skill.survival-any") || isSurvivalName(name)) {
    return localizedField("SurvivalName", "SurvivalPlaceholder");
  }
  return localizedField("Specialization", "SpecializationPlaceholder");
}

export function skillTotalWarning(total) {
  const active = Number(total) > SKILL_TOTAL_WARNING_THRESHOLD;
  return {
    active,
    title: active
      ? game.i18n.format("GINZZZU_C7PH.Creation.Allocation.SkillTotalWarning", {
        threshold: SKILL_TOTAL_WARNING_THRESHOLD
      })
      : ""
  };
}

function localizedField(label, placeholder) {
  return {
    label: game.i18n.localize(`GINZZZU_C7PH.Creation.Allocation.${label}`),
    placeholder: game.i18n.localize(`GINZZZU_C7PH.Creation.Allocation.${placeholder}`)
  };
}

function isLanguageName(name) {
  return name.includes("язык") || name.includes("language");
}

function isOwnName(name) {
  return name.includes("родн") || name.includes("own") || name.includes("native");
}

function isArtCraftName(name) {
  return name.includes("искусство/ремесло")
    || name.includes("искусство и ремесло")
    || name.includes("art/craft")
    || name.includes("art and craft");
}

function isSurvivalName(name) {
  return name.includes("выживание") || name.includes("survival");
}

export function compareOccupationSkillRows(left, right) {
  if (left.sourceRank !== right.sourceRank) return left.sourceRank - right.sourceRank;
  return compareSkillNames(left, right);
}

export function compareSkillNames(left, right) {
  return left.name.localeCompare(right.name, game.i18n.lang, {sensitivity: "base"});
}
