export function allocationPointPresentation({remaining, valid} = {}) {
  const difference = Number.isFinite(Number(remaining)) ? Math.trunc(Number(remaining)) : 0;

  if (difference < 0) {
    return {
      icon: "fa-circle-exclamation",
      label: game.i18n.format("GINZZZU_C7PH.Creation.Allocation.PointOverflow", {
        count: Math.abs(difference)
      }),
      stateClass: "is-invalid"
    };
  }

  if (difference > 0) {
    return {
      icon: "fa-circle-info",
      label: game.i18n.format("GINZZZU_C7PH.Creation.Allocation.PointRemaining", {
        count: difference
      }),
      stateClass: "has-remaining"
    };
  }

  if (valid) {
    return {
      icon: "fa-circle-check",
      label: game.i18n.localize("GINZZZU_C7PH.Creation.Allocation.PointComplete"),
      stateClass: "is-complete"
    };
  }

  return {
    icon: "fa-circle-exclamation",
    label: game.i18n.localize("GINZZZU_C7PH.Creation.Allocation.PointNeedsAttention"),
    stateClass: "is-invalid"
  };
}
