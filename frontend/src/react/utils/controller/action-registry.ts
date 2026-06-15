export enum ActionId {
  NAV_UP = "NAV_UP",
  NAV_DOWN = "NAV_DOWN",
  NAV_LEFT = "NAV_LEFT",
  NAV_RIGHT = "NAV_RIGHT",
  ACCEPT = "ACCEPT",
  CANCEL = "CANCEL",
  BACK = "BACK",
  OPEN_PROMPT_LIBRARY = "OPEN_PROMPT_LIBRARY",
  OPEN_COMMAND_PALETTE = "OPEN_COMMAND_PALETTE",
  OPEN_AGENT_WHEEL = "OPEN_AGENT_WHEEL",
  ACCEPT_SUGGESTION = "ACCEPT_SUGGESTION",
  NEXT_SUGGESTION = "NEXT_SUGGESTION",
  PREVIOUS_SUGGESTION = "PREVIOUS_SUGGESTION",
  EXECUTE_PROMPT = "EXECUTE_PROMPT",
  SAVE_PROMPT = "SAVE_PROMPT",
  COMPLETE_PROMPT = "COMPLETE_PROMPT",
  REGENERATE = "REGENERATE",
  START_MACRO_RECORDING = "START_MACRO_RECORDING",
  STOP_MACRO_RECORDING = "STOP_MACRO_RECORDING",
  NEW_SESSION = "NEW_SESSION",
  OPEN_SETTINGS = "OPEN_SETTINGS",
  OPEN_SNIPPET_VAULT = "OPEN_SNIPPET_VAULT",
  EDIT_SELECTED_BLOCK = "EDIT_SELECTED_BLOCK",
  OPEN_CONTEXT_MENU = "OPEN_CONTEXT_MENU",
  PREVIOUS_PANEL = "PREVIOUS_PANEL",
  NEXT_PANEL = "NEXT_PANEL",
  PREVIOUS_CATEGORY = "PREVIOUS_CATEGORY",
  NEXT_CATEGORY = "NEXT_CATEGORY",

  // IDE-specific actions
  IDE_ACCEPT_COMPLETION = "IDE_ACCEPT_COMPLETION",
  IDE_NEXT_COMPLETION = "IDE_NEXT_COMPLETION",
  IDE_PREV_COMPLETION = "IDE_PREV_COMPLETION",
  IDE_DISMISS_COMPLETION = "IDE_DISMISS_COMPLETION",
  IDE_OPEN_COMMAND_WHEEL = "IDE_OPEN_COMMAND_WHEEL",
  IDE_FORMAT_FILE = "IDE_FORMAT_FILE",
  IDE_RUN_COMMAND = "IDE_RUN_COMMAND",
  IDE_NEXT_DIAGNOSTIC = "IDE_NEXT_DIAGNOSTIC",
  IDE_GO_TO_DEFINITION = "IDE_GO_TO_DEFINITION",
  IDE_TOGGLE_PREDICTIVE_BAR = "IDE_TOGGLE_PREDICTIVE_BAR",
  IDE_OPEN_FILE_TREE = "IDE_OPEN_FILE_TREE",
  IDE_SAVE_FILE = "IDE_SAVE_FILE",
  IDE_PREV_TAB = "IDE_PREV_TAB",
  IDE_NEXT_TAB = "IDE_NEXT_TAB",
  IDE_OPEN_SNIPPET_WHEEL = "IDE_OPEN_SNIPPET_WHEEL",
  IDE_ACCEPT_SNIPPET = "IDE_ACCEPT_SNIPPET",
  IDE_NEXT_PLACEHOLDER = "IDE_NEXT_PLACEHOLDER",
  IDE_PREV_PLACEHOLDER = "IDE_PREV_PLACEHOLDER",
  IDE_CANCEL_COMMAND = "IDE_CANCEL_COMMAND",
  IDE_CONFIRM_COMMAND = "IDE_CONFIRM_COMMAND",
  IDE_ENTER_EDIT_MODE = "IDE_ENTER_EDIT_MODE",
  IDE_ENTER_NAVIGATION_MODE = "IDE_ENTER_NAVIGATION_MODE",
}

export type ActionCategory =
  | "navigation"
  | "prompt"
  | "command"
  | "macro"
  | "agent"
  | "system"
  | "ide";

export interface ActionDefinition {
  id: ActionId | string;
  title: string;
  category: ActionCategory;
  keyboardFallback?: string;
  destructive?: boolean;
}

export class ActionRegistry {
  private actions = new Map<string, ActionDefinition>();

  register(action: ActionDefinition) {
    this.actions.set(action.id, action);
  }

  get(id: string): ActionDefinition | undefined {
    return this.actions.get(id);
  }

  list(): ActionDefinition[] {
    return [...this.actions.values()];
  }

  listByCategory(category: ActionCategory): ActionDefinition[] {
    return this.list().filter((a) => a.category === category);
  }
}

export const defaultActions: ActionDefinition[] = [
  {
    id: ActionId.OPEN_PROMPT_LIBRARY,
    title: "Open Prompt Library",
    category: "prompt",
    keyboardFallback: "l4",
  },
  {
    id: ActionId.OPEN_COMMAND_PALETTE,
    title: "Open Command Palette",
    category: "command",
    keyboardFallback: "r5",
  },
  {
    id: ActionId.ACCEPT_SUGGESTION,
    title: "Accept Suggestion",
    category: "prompt",
    keyboardFallback: "r4",
  },
  {
    id: ActionId.NEXT_SUGGESTION,
    title: "Next Suggestion",
    category: "prompt",
    keyboardFallback: "ArrowDown",
  },
  {
    id: ActionId.PREVIOUS_SUGGESTION,
    title: "Previous Suggestion",
    category: "prompt",
    keyboardFallback: "ArrowUp",
  },
  {
    id: ActionId.EXECUTE_PROMPT,
    title: "Execute Prompt",
    category: "prompt",
    keyboardFallback: "r5_hold",
  },
  { id: ActionId.SAVE_PROMPT, title: "Save Prompt", category: "prompt", keyboardFallback: "l5" },
  {
    id: ActionId.COMPLETE_PROMPT,
    title: "Complete Prompt",
    category: "prompt",
    keyboardFallback: "l4+r4",
  },
  {
    id: ActionId.START_MACRO_RECORDING,
    title: "Start/Stop Macro Recording",
    category: "macro",
    keyboardFallback: "l5+r5",
  },
  {
    id: ActionId.OPEN_AGENT_WHEEL,
    title: "Open Agent Wheel",
    category: "agent",
    keyboardFallback: "l4_hold",
  },
  { id: ActionId.REGENERATE, title: "Regenerate", category: "prompt", keyboardFallback: "r4_hold" },
  { id: ActionId.BACK, title: "Back / Cancel", category: "navigation", keyboardFallback: "Escape" },
  {
    id: ActionId.NAV_UP,
    title: "Navigate Up",
    category: "navigation",
    keyboardFallback: "ArrowUp",
  },
  {
    id: ActionId.NAV_DOWN,
    title: "Navigate Down",
    category: "navigation",
    keyboardFallback: "ArrowDown",
  },
  {
    id: ActionId.NAV_LEFT,
    title: "Navigate Left",
    category: "navigation",
    keyboardFallback: "ArrowLeft",
  },
  {
    id: ActionId.NAV_RIGHT,
    title: "Navigate Right",
    category: "navigation",
    keyboardFallback: "ArrowRight",
  },

  // IDE actions — active when IDEView has focus
  {
    id: ActionId.IDE_ACCEPT_COMPLETION,
    title: "Accept Completion",
    category: "ide",
    keyboardFallback: "Tab",
  },
  {
    id: ActionId.IDE_NEXT_COMPLETION,
    title: "Next Completion",
    category: "ide",
    keyboardFallback: "ArrowDown",
  },
  {
    id: ActionId.IDE_PREV_COMPLETION,
    title: "Previous Completion",
    category: "ide",
    keyboardFallback: "ArrowUp",
  },
  {
    id: ActionId.IDE_DISMISS_COMPLETION,
    title: "Dismiss Completion",
    category: "ide",
    keyboardFallback: "Escape",
  },
  {
    id: ActionId.IDE_OPEN_COMMAND_WHEEL,
    title: "Open Command Wheel",
    category: "ide",
    keyboardFallback: "y",
  },
  { id: ActionId.IDE_FORMAT_FILE, title: "Format File", category: "ide", keyboardFallback: "l5" },
  { id: ActionId.IDE_RUN_COMMAND, title: "Run Command", category: "ide", keyboardFallback: "r5" },
  {
    id: ActionId.IDE_NEXT_DIAGNOSTIC,
    title: "Next Diagnostic",
    category: "ide",
    keyboardFallback: "l1",
  },
  {
    id: ActionId.IDE_GO_TO_DEFINITION,
    title: "Go to Definition",
    category: "ide",
    keyboardFallback: "a_hold",
  },
  {
    id: ActionId.IDE_TOGGLE_PREDICTIVE_BAR,
    title: "Toggle Predictive Bar",
    category: "ide",
    keyboardFallback: "x",
  },
  { id: ActionId.IDE_SAVE_FILE, title: "Save File", category: "ide", keyboardFallback: "Ctrl+s" },
  { id: ActionId.IDE_PREV_TAB, title: "Previous Tab", category: "ide", keyboardFallback: "l1" },
  { id: ActionId.IDE_NEXT_TAB, title: "Next Tab", category: "ide", keyboardFallback: "r1" },
  {
    id: ActionId.IDE_OPEN_SNIPPET_WHEEL,
    title: "Open Snippet Wheel",
    category: "ide",
    keyboardFallback: "l2",
  },
  {
    id: ActionId.IDE_ACCEPT_SNIPPET,
    title: "Accept Snippet",
    category: "ide",
    keyboardFallback: "Tab",
  },
  {
    id: ActionId.IDE_NEXT_PLACEHOLDER,
    title: "Next Snippet Placeholder",
    category: "ide",
    keyboardFallback: "Tab",
  },
  {
    id: ActionId.IDE_PREV_PLACEHOLDER,
    title: "Previous Snippet Placeholder",
    category: "ide",
    keyboardFallback: "Shift+Tab",
  },
  {
    id: ActionId.IDE_CANCEL_COMMAND,
    title: "Cancel Running Command",
    category: "ide",
    keyboardFallback: "b",
    destructive: false,
  },
  {
    id: ActionId.IDE_CONFIRM_COMMAND,
    title: "Confirm Command",
    category: "ide",
    keyboardFallback: "a",
  },
  {
    id: ActionId.IDE_ENTER_EDIT_MODE,
    title: "Enter Edit Mode",
    category: "ide",
    keyboardFallback: "Start",
  },
  {
    id: ActionId.IDE_ENTER_NAVIGATION_MODE,
    title: "Enter Navigation Mode",
    category: "ide",
    keyboardFallback: "Select",
  },
];

export const defaultSteamDeckProfile = {
  id: "steamdeck.default",
  name: "Steam Deck Default",
  device: "steamdeck",
  bindings: {
    "DPadUp.tap": ActionId.NAV_UP,
    "DPadDown.tap": ActionId.NAV_DOWN,
    "DPadLeft.tap": ActionId.NAV_LEFT,
    "DPadRight.tap": ActionId.NAV_RIGHT,
    "A.tap": ActionId.ACCEPT,
    "B.tap": ActionId.BACK,
    "B.hold": ActionId.CANCEL,
    "X.tap": ActionId.EDIT_SELECTED_BLOCK,
    "Y.tap": ActionId.OPEN_CONTEXT_MENU,
    "L1.tap": ActionId.PREVIOUS_PANEL,
    "R1.tap": ActionId.NEXT_PANEL,
    "L2.tap": ActionId.PREVIOUS_CATEGORY,
    "R2.tap": ActionId.NEXT_CATEGORY,
    "L4.tap": ActionId.OPEN_PROMPT_LIBRARY,
    "L4.hold": ActionId.OPEN_AGENT_WHEEL,
    "L5.tap": ActionId.SAVE_PROMPT,
    "L5.hold": ActionId.OPEN_SNIPPET_VAULT,
    "R4.tap": ActionId.ACCEPT_SUGGESTION,
    "R4.hold": ActionId.REGENERATE,
    "R5.tap": ActionId.OPEN_COMMAND_PALETTE,
    "R5.hold": ActionId.EXECUTE_PROMPT,
    "L4+R4.chord": ActionId.COMPLETE_PROMPT,
    "L5+R5.chord": ActionId.START_MACRO_RECORDING,

    // IDE mode bindings (active when IDEView has focus + IDE_EDIT or IDE_PREDICTION mode)
    "A.ide_prediction": ActionId.IDE_ACCEPT_COMPLETION,
    "B.ide_prediction": ActionId.IDE_DISMISS_COMPLETION,
    "DPadDown.ide_prediction": ActionId.IDE_NEXT_COMPLETION,
    "DPadUp.ide_prediction": ActionId.IDE_PREV_COMPLETION,
    "Y.ide_edit": ActionId.IDE_OPEN_COMMAND_WHEEL,
    "X.ide_edit": ActionId.IDE_TOGGLE_PREDICTIVE_BAR,
    "L5.ide_edit": ActionId.IDE_FORMAT_FILE,
    "R5.ide_edit": ActionId.IDE_RUN_COMMAND,
    "L1.ide_edit": ActionId.IDE_NEXT_DIAGNOSTIC,
    "A.ide_edit_hold": ActionId.IDE_GO_TO_DEFINITION,
    "L1.ide_navigation": ActionId.IDE_PREV_TAB,
    "R1.ide_navigation": ActionId.IDE_NEXT_TAB,
    "A.ide_command": ActionId.IDE_CONFIRM_COMMAND,
    "B.ide_command": ActionId.IDE_CANCEL_COMMAND,
    "A.ide_snippet": ActionId.IDE_ACCEPT_SNIPPET,
    "B.ide_snippet": ActionId.IDE_DISMISS_COMPLETION,
    "L1.ide_snippet": ActionId.IDE_PREV_PLACEHOLDER,
    "R1.ide_snippet": ActionId.IDE_NEXT_PLACEHOLDER,
  },
} as const;
