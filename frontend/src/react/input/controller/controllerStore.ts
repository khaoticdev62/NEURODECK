import type {
  ControllerRuntimeState,
  ControllerSettings,
} from "../../../shared/types/controller";

export const controllerDefaults: ControllerSettings = {
  enabled: true,
  preferredProfile: "steam_deck",
  glyphStyle: "auto",
  confirmButton: "south",
  stickDeadzone: 0.28,
  triggerThreshold: 0.45,
  initialRepeatDelayMs: 350,
  repeatIntervalMs: 85,
  buttonDebounceMs: 120,
  scrollSpeed: 1,
  hapticsEnabled: true,
  showHints: true,
  reducedMotion: false,
  browserActionLayerEnabled: true,
  terminalActionLayerEnabled: true,
  textInputAssistEnabled: true,
  preferSteamDeckLayout: true,
};

export const controllerRuntimeDefaults: ControllerRuntimeState = {
  devices: [],
  lastInputSource: "keyboard",
  currentScreenId: "app-shell",
  actionLayer: "global",
  connectionStatus: "none",
  helpOverlayOpen: false,
  debugOverlayOpen: false,
};
