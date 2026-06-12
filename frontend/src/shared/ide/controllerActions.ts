/**
 * IDE-specific controller actions and mode definitions.
 * Extends the existing action-registry.ts with IDE-specific bindings.
 */
import type { IdeMode } from '../contracts/ide.contracts';

export const IDE_ACTION = {
  // Completion actions (PREDICTION mode)
  IDE_ACCEPT_COMPLETION: 'IDE_ACCEPT_COMPLETION',
  IDE_NEXT_COMPLETION: 'IDE_NEXT_COMPLETION',
  IDE_PREV_COMPLETION: 'IDE_PREV_COMPLETION',
  IDE_DISMISS_COMPLETION: 'IDE_DISMISS_COMPLETION',

  // Editor actions (EDIT mode)
  IDE_OPEN_COMMAND_WHEEL: 'IDE_OPEN_COMMAND_WHEEL',
  IDE_FORMAT_FILE: 'IDE_FORMAT_FILE',
  IDE_RUN_COMMAND: 'IDE_RUN_COMMAND',
  IDE_NEXT_DIAGNOSTIC: 'IDE_NEXT_DIAGNOSTIC',
  IDE_GO_TO_DEFINITION: 'IDE_GO_TO_DEFINITION',
  IDE_TOGGLE_PREDICTIVE_BAR: 'IDE_TOGGLE_PREDICTIVE_BAR',

  // Navigation actions (NAVIGATION mode)
  IDE_OPEN_FILE_TREE: 'IDE_OPEN_FILE_TREE',
  IDE_CLOSE_FILE: 'IDE_CLOSE_FILE',
  IDE_SAVE_FILE: 'IDE_SAVE_FILE',
  IDE_PREV_TAB: 'IDE_PREV_TAB',
  IDE_NEXT_TAB: 'IDE_NEXT_TAB',

  // Snippet actions (SNIPPET mode)
  IDE_OPEN_SNIPPET_WHEEL: 'IDE_OPEN_SNIPPET_WHEEL',
  IDE_ACCEPT_SNIPPET: 'IDE_ACCEPT_SNIPPET',
  IDE_NEXT_PLACEHOLDER: 'IDE_NEXT_PLACEHOLDER',
  IDE_PREV_PLACEHOLDER: 'IDE_PREV_PLACEHOLDER',

  // Command mode
  IDE_CANCEL_COMMAND: 'IDE_CANCEL_COMMAND',
  IDE_CONFIRM_COMMAND: 'IDE_CONFIRM_COMMAND',

  // Mode switching
  IDE_ENTER_EDIT_MODE: 'IDE_ENTER_EDIT_MODE',
  IDE_ENTER_NAVIGATION_MODE: 'IDE_ENTER_NAVIGATION_MODE',
} as const;

export type IdeActionId = typeof IDE_ACTION[keyof typeof IDE_ACTION];

export type IdeActionDefinition = {
  id: IdeActionId;
  title: string;
  mode: IdeMode;
  button: string;
  holdButton?: string;
  description: string;
};

export const IDE_ACTION_DEFINITIONS: IdeActionDefinition[] = [
  // PREDICTION mode
  {
    id: IDE_ACTION.IDE_ACCEPT_COMPLETION,
    title: 'Accept Completion',
    mode: 'IDE_PREDICTION',
    button: 'A',
    description: 'Accept the currently highlighted code completion',
  },
  {
    id: IDE_ACTION.IDE_NEXT_COMPLETION,
    title: 'Next Completion',
    mode: 'IDE_PREDICTION',
    button: 'DPadDown',
    description: 'Move to the next completion suggestion',
  },
  {
    id: IDE_ACTION.IDE_PREV_COMPLETION,
    title: 'Previous Completion',
    mode: 'IDE_PREDICTION',
    button: 'DPadUp',
    description: 'Move to the previous completion suggestion',
  },
  {
    id: IDE_ACTION.IDE_DISMISS_COMPLETION,
    title: 'Dismiss Completion',
    mode: 'IDE_PREDICTION',
    button: 'B',
    description: 'Close the completion list',
  },

  // EDIT mode
  {
    id: IDE_ACTION.IDE_OPEN_COMMAND_WHEEL,
    title: 'Open Command Wheel',
    mode: 'IDE_EDIT',
    button: 'Y',
    description: 'Open the radial command wheel (Run / Test / Build / Format)',
  },
  {
    id: IDE_ACTION.IDE_TOGGLE_PREDICTIVE_BAR,
    title: 'Toggle Predictive Bar',
    mode: 'IDE_EDIT',
    button: 'X',
    description: 'Show or hide the predictive completion bar',
  },
  {
    id: IDE_ACTION.IDE_FORMAT_FILE,
    title: 'Format File',
    mode: 'IDE_EDIT',
    button: 'L5',
    description: 'Format the current file using LSP or project formatter',
  },
  {
    id: IDE_ACTION.IDE_RUN_COMMAND,
    title: 'Run Command',
    mode: 'IDE_EDIT',
    button: 'R5',
    description: 'Run the top suggested project command (dev / test / build)',
  },
  {
    id: IDE_ACTION.IDE_NEXT_DIAGNOSTIC,
    title: 'Next Diagnostic',
    mode: 'IDE_EDIT',
    button: 'L1',
    description: 'Jump to the next LSP diagnostic error or warning',
  },
  {
    id: IDE_ACTION.IDE_GO_TO_DEFINITION,
    title: 'Go to Definition',
    mode: 'IDE_EDIT',
    button: 'A',
    holdButton: 'A',
    description: 'Go to the definition of the symbol under the cursor (hold A)',
  },

  // NAVIGATION mode
  {
    id: IDE_ACTION.IDE_OPEN_FILE_TREE,
    title: 'Open File Tree',
    mode: 'IDE_NAVIGATION',
    button: 'Select',
    description: 'Toggle the file explorer sidebar',
  },
  {
    id: IDE_ACTION.IDE_SAVE_FILE,
    title: 'Save File',
    mode: 'IDE_NAVIGATION',
    button: 'L5',
    description: 'Save the current file',
  },
  {
    id: IDE_ACTION.IDE_PREV_TAB,
    title: 'Previous Tab',
    mode: 'IDE_NAVIGATION',
    button: 'L1',
    description: 'Switch to the previous editor tab',
  },
  {
    id: IDE_ACTION.IDE_NEXT_TAB,
    title: 'Next Tab',
    mode: 'IDE_NAVIGATION',
    button: 'R1',
    description: 'Switch to the next editor tab',
  },

  // SNIPPET mode
  {
    id: IDE_ACTION.IDE_OPEN_SNIPPET_WHEEL,
    title: 'Open Snippet Wheel',
    mode: 'IDE_SNIPPET',
    button: 'L4',
    description: 'Open the controller-friendly snippet selection wheel',
  },
  {
    id: IDE_ACTION.IDE_ACCEPT_SNIPPET,
    title: 'Insert Snippet',
    mode: 'IDE_SNIPPET',
    button: 'A',
    description: 'Insert the selected snippet at cursor',
  },
  {
    id: IDE_ACTION.IDE_NEXT_PLACEHOLDER,
    title: 'Next Placeholder',
    mode: 'IDE_SNIPPET',
    button: 'R1',
    description: 'Jump to the next snippet placeholder',
  },
  {
    id: IDE_ACTION.IDE_PREV_PLACEHOLDER,
    title: 'Previous Placeholder',
    mode: 'IDE_SNIPPET',
    button: 'L1',
    description: 'Jump to the previous snippet placeholder',
  },

  // COMMAND mode
  {
    id: IDE_ACTION.IDE_CONFIRM_COMMAND,
    title: 'Confirm Command',
    mode: 'IDE_COMMAND',
    button: 'A',
    description: 'Confirm and execute the selected command',
  },
  {
    id: IDE_ACTION.IDE_CANCEL_COMMAND,
    title: 'Cancel Command',
    mode: 'IDE_COMMAND',
    button: 'B',
    description: 'Cancel command execution or close the confirmation dialog',
  },
];

export const IDE_MODES: Record<IdeMode, { label: string; hint: string }> = {
  IDE_NAVIGATION: { label: 'Navigate', hint: 'A=Open  B=Back  L1/R1=Tabs  Select=Files' },
  IDE_EDIT: { label: 'Edit', hint: 'Y=Commands  X=Predict  L5=Format  R5=Run  Hold A=Define' },
  IDE_PREDICTION: { label: 'Predict', hint: 'A=Accept  B=Dismiss  ↑↓=Navigate' },
  IDE_COMMAND: { label: 'Command', hint: 'A=Confirm  B=Cancel' },
  IDE_SNIPPET: { label: 'Snippet', hint: 'A=Insert  L1/R1=Placeholders  B=Cancel' },
};

export function getIdeActionsForMode(mode: IdeMode): IdeActionDefinition[] {
  return IDE_ACTION_DEFINITIONS.filter((a) => a.mode === mode);
}

export function getIdeActionById(id: IdeActionId): IdeActionDefinition | undefined {
  return IDE_ACTION_DEFINITIONS.find((a) => a.id === id);
}
