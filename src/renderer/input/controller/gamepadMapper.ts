import type {
  ControllerAction,
  ControllerConfirmButton,
  ControllerDevice,
  ControllerDeviceKind,
} from "../../shared/types/controller";

export function detectControllerKind(id: string): ControllerDeviceKind {
  const normalized = id.toLowerCase();
  if (normalized.includes("steam") && normalized.includes("virtual")) return "steam_input_virtual";
  if (normalized.includes("steam deck")) return "steam_deck";
  if (normalized.includes("xbox") || normalized.includes("xinput")) return "xbox";
  if (normalized.includes("dualsense") || normalized.includes("ps5")) return "dualsense";
  if (normalized.includes("dualshock") || normalized.includes("wireless controller"))
    return "dualshock";
  if (normalized.includes("switch") || normalized.includes("pro controller")) return "switch_pro";
  if (normalized.trim().length === 0) return "unknown";
  return "generic";
}

export function mapGamepadDevice(gamepad: Gamepad): ControllerDevice {
  return {
    id: `${gamepad.id}-${gamepad.index}`,
    index: gamepad.index,
    name: gamepad.id || `Controller ${gamepad.index + 1}`,
    kind: detectControllerKind(gamepad.id || ""),
    mapping: gamepad.mapping === "standard" ? "standard" : "nonstandard",
    connected: gamepad.connected,
    buttons: gamepad.buttons.length,
    axes: gamepad.axes.length,
    lastSeenAt: new Date().toISOString(),
  };
}

type ButtonMap = Partial<Record<number, ControllerAction>>;

function buildStandardMap(confirmButton: ControllerConfirmButton): ButtonMap {
  const confirmIndex = confirmButton === "south" ? 0 : 1;
  const cancelIndex = confirmButton === "south" ? 1 : 0;
  return {
    [confirmIndex]: "confirm",
    [cancelIndex]: "cancel",
    2: "reload",
    3: "openSearch",
    4: "previousTab",
    5: "nextTab",
    8: "openHelp",
    9: "openMainMenu",
    10: "focusPrevious",
    11: "toggleFullscreen",
    12: "focusUp",
    13: "focusDown",
    14: "focusLeft",
    15: "focusRight",
  };
}

export function mapButtonsToActions(
  gamepad: Gamepad,
  confirmButton: ControllerConfirmButton,
  triggerThreshold: number
): ControllerAction[] {
  const map = buildStandardMap(confirmButton);
  const actions: ControllerAction[] = [];

  gamepad.buttons.forEach((button, index) => {
    if (index === 6 && button.value >= triggerThreshold) actions.push("pageUp");
    if (index === 7 && button.value >= triggerThreshold) actions.push("pageDown");
    if (!button.pressed) return;
    const action = map[index];
    if (action) actions.push(action);
  });

  return actions;
}
