export const TERMINAL_EVENTS = {
  OUTPUT: "pty_output",
  EXIT: "pty_exit",
  CREATED: "pty_session_created",
  RESIZED: "pty_resized",
  KILLED: "pty_killed",
} as const;

export type TerminalEventName = typeof TERMINAL_EVENTS[keyof typeof TERMINAL_EVENTS];

