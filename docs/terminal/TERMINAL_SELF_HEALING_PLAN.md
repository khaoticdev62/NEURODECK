# Terminal Self-Healing Plan

Recovery actions should handle:

- PTY spawn failure
- missing shell binary
- cwd fallback
- PTY crash
- renderer reconnect

Recovery must preserve honesty: if the shell is gone, the UI shows recovery state or a blocked state rather than pretending the session survived.

