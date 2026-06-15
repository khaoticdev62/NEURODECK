export type ControllerConnectionStatus =
  | "none"
  | "connected"
  | "disconnected"
  | "unsupported"
  | "unknown";

export type ControllerDeviceKind =
  | "steam_deck"
  | "steam_input_virtual"
  | "xbox"
  | "dualsense"
  | "dualshock"
  | "switch_pro"
  | "generic"
  | "keyboard"
  | "unknown";

export type ControllerGlyphStyle = "auto" | "steam_deck" | "xbox" | "playstation" | "generic";

export type ControllerConfirmButton = "south" | "east";

export type ControllerAction =
  | "confirm"
  | "cancel"
  | "back"
  | "forward"
  | "openCommandPalette"
  | "openSearch"
  | "openMainMenu"
  | "openHelp"
  | "openQuickActions"
  | "focusNext"
  | "focusPrevious"
  | "focusUp"
  | "focusDown"
  | "focusLeft"
  | "focusRight"
  | "scrollUp"
  | "scrollDown"
  | "pageUp"
  | "pageDown"
  | "nextTab"
  | "previousTab"
  | "newTab"
  | "closeTab"
  | "reload"
  | "save"
  | "regenerate"
  | "copy"
  | "paste"
  | "delete"
  | "rename"
  | "toggleFavorite"
  | "toggleDetails"
  | "toggleFullscreen"
  | "zoomIn"
  | "zoomOut"
  | "resetZoom"
  | "openExternal"
  | "submitPrompt"
  | "stopGeneration"
  | "toggleVoice"
  | "openControllerOverlay"
  | "emergencyEscape";

export type FocusZoneKind =
  | "navigation"
  | "toolbar"
  | "content"
  | "list"
  | "grid"
  | "form"
  | "modal"
  | "dialog"
  | "browser"
  | "terminal"
  | "settings"
  | "status"
  | "overlay";

export interface ControllerDevice {
  id: string;
  index: number;
  name: string;
  kind: ControllerDeviceKind;
  mapping: "standard" | "nonstandard" | "";
  connected: boolean;
  buttons: number;
  axes: number;
  lastSeenAt: string;
}

export interface FocusNode {
  id: string;
  elementId: string;
  zone: FocusZoneKind;
  disabled?: boolean;
  up?: string;
  down?: string;
  left?: string;
  right?: string;
  confirm?: ControllerAction;
  cancel?: ControllerAction;
}

export interface FocusGraph {
  screenId: string;
  defaultNodeId: string;
  nodes: FocusNode[];
  escapeNodeId?: string;
}

export interface ControllerSettings {
  enabled: boolean;
  preferredProfile: "steam_deck" | "xbox" | "playstation" | "generic" | "custom";
  glyphStyle: ControllerGlyphStyle;
  confirmButton: ControllerConfirmButton;
  stickDeadzone: number;
  triggerThreshold: number;
  initialRepeatDelayMs: number;
  repeatIntervalMs: number;
  buttonDebounceMs: number;
  scrollSpeed: number;
  hapticsEnabled: boolean;
  showHints: boolean;
  reducedMotion: boolean;
  browserActionLayerEnabled: boolean;
  terminalActionLayerEnabled: boolean;
  textInputAssistEnabled: boolean;
  preferSteamDeckLayout: boolean;
}

export interface ControllerRuntimeState {
  devices: ControllerDevice[];
  activeDeviceId?: string;
  lastInputSource: "controller" | "keyboard" | "mouse" | "touch";
  currentFocusNodeId?: string;
  currentFocusZone?: FocusZoneKind;
  currentScreenId: string;
  actionLayer: string;
  connectionStatus: ControllerConnectionStatus;
  lastAction?: ControllerAction;
  helpOverlayOpen: boolean;
  debugOverlayOpen: boolean;
  browserControlMode?: "chrome" | "page" | "address" | "permissionPrompt" | "downloadShelf";
}
