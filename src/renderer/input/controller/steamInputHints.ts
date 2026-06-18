import type { ControllerAction, ControllerDeviceKind } from "../../shared/types/controller";

const GENERIC_HINTS: Partial<Record<ControllerAction, string>> = {
  confirm: "A / Cross",
  cancel: "B / Circle",
  reload: "X / Square",
  openSearch: "Y / Triangle",
  previousTab: "LB / L1",
  nextTab: "RB / R1",
  pageUp: "LT / L2",
  pageDown: "RT / R2",
  openMainMenu: "Menu / Options",
  openHelp: "View / Share",
  toggleFullscreen: "R3",
};

const STEAM_DECK_HINTS: Partial<Record<ControllerAction, string>> = {
  ...GENERIC_HINTS,
  confirm: "A",
  cancel: "B",
  openSearch: "Y",
  reload: "X",
  previousTab: "LB",
  nextTab: "RB",
  pageUp: "LT",
  pageDown: "RT",
  openHelp: "Select",
  openMainMenu: "Start",
  save: "L5",
  regenerate: "R4",
  newTab: "R5",
};

export function getActionHint(action: ControllerAction, kind: ControllerDeviceKind) {
  if (kind === "steam_deck") {
    return STEAM_DECK_HINTS[action] ?? GENERIC_HINTS[action] ?? action;
  }
  return GENERIC_HINTS[action] ?? action;
}
