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

function defineAction(
  id: ActionId,
  title: string,
  category: ActionCategory,
  keyboardFallback: string,
  destructive = false
): ActionDefinition {
  return { id, title, category, keyboardFallback, destructive };
}

export const defaultActions: ActionDefinition[] = [
  defineAction(ActionId.OPEN_PROMPT_LIBRARY, "Open Prompt Library", "prompt", "l4"),
  defineAction(ActionId.OPEN_COMMAND_PALETTE, "Open Command Palette", "command", "r5"),
  defineAction(ActionId.ACCEPT_SUGGESTION, "Accept Suggestion", "prompt", "r4"),
  defineAction(ActionId.NEXT_SUGGESTION, "Next Suggestion", "prompt", "ArrowDown"),
  defineAction(ActionId.PREVIOUS_SUGGESTION, "Previous Suggestion", "prompt", "ArrowUp"),
  defineAction(ActionId.EXECUTE_PROMPT, "Execute Prompt", "prompt", "r5_hold"),
  defineAction(ActionId.SAVE_PROMPT, "Save Prompt", "prompt", "l5"),
  defineAction(ActionId.COMPLETE_PROMPT, "Complete Prompt", "prompt", "l4+r4"),
  defineAction(ActionId.START_MACRO_RECORDING, "Start/Stop Macro Recording", "macro", "l5+r5"),
  defineAction(ActionId.OPEN_AGENT_WHEEL, "Open Agent Wheel", "agent", "l4_hold"),
  defineAction(ActionId.REGENERATE, "Regenerate", "prompt", "r4_hold"),
  defineAction(ActionId.BACK, "Back / Cancel", "navigation", "Escape"),
  defineAction(ActionId.NAV_UP, "Navigate Up", "navigation", "ArrowUp"),
  defineAction(ActionId.NAV_DOWN, "Navigate Down", "navigation", "ArrowDown"),
  defineAction(ActionId.NAV_LEFT, "Navigate Left", "navigation", "ArrowLeft"),
  defineAction(ActionId.NAV_RIGHT, "Navigate Right", "navigation", "ArrowRight"),

  // IDE actions — active when IDEView has focus
  defineAction(ActionId.IDE_ACCEPT_COMPLETION, "Accept Completion", "ide", "Tab"),
  defineAction(ActionId.IDE_NEXT_COMPLETION, "Next Completion", "ide", "ArrowDown"),
  defineAction(ActionId.IDE_PREV_COMPLETION, "Previous Completion", "ide", "ArrowUp"),
  defineAction(ActionId.IDE_DISMISS_COMPLETION, "Dismiss Completion", "ide", "Escape"),
  defineAction(ActionId.IDE_OPEN_COMMAND_WHEEL, "Open Command Wheel", "ide", "y"),
  defineAction(ActionId.IDE_FORMAT_FILE, "Format File", "ide", "l5"),
  defineAction(ActionId.IDE_RUN_COMMAND, "Run Command", "ide", "r5"),
  defineAction(ActionId.IDE_NEXT_DIAGNOSTIC, "Next Diagnostic", "ide", "l1"),
  defineAction(ActionId.IDE_GO_TO_DEFINITION, "Go to Definition", "ide", "a_hold"),
  defineAction(ActionId.IDE_TOGGLE_PREDICTIVE_BAR, "Toggle Predictive Bar", "ide", "x"),
  defineAction(ActionId.IDE_SAVE_FILE, "Save File", "ide", "Ctrl+s"),
  defineAction(ActionId.IDE_PREV_TAB, "Previous Tab", "ide", "l1"),
  defineAction(ActionId.IDE_NEXT_TAB, "Next Tab", "ide", "r1"),
  defineAction(ActionId.IDE_OPEN_SNIPPET_WHEEL, "Open Snippet Wheel", "ide", "l2"),
  defineAction(ActionId.IDE_ACCEPT_SNIPPET, "Accept Snippet", "ide", "Tab"),
  defineAction(ActionId.IDE_NEXT_PLACEHOLDER, "Next Snippet Placeholder", "ide", "Tab"),
  defineAction(ActionId.IDE_PREV_PLACEHOLDER, "Previous Snippet Placeholder", "ide", "Shift+Tab"),
  defineAction(ActionId.IDE_CANCEL_COMMAND, "Cancel Running Command", "ide", "b", false),
  defineAction(ActionId.IDE_CONFIRM_COMMAND, "Confirm Command", "ide", "a"),
  defineAction(ActionId.IDE_ENTER_EDIT_MODE, "Enter Edit Mode", "ide", "Start"),
  defineAction(ActionId.IDE_ENTER_NAVIGATION_MODE, "Enter Navigation Mode", "ide", "Select"),
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
