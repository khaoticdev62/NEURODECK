# Terminal AI Command Assistant Plan

The assistant explains commands and suggests next steps. It does not auto-execute.

Safety flow:

1. Inspect context.
2. Redact secrets.
3. Classify the command.
4. Ask for confirmation when needed.
5. Write to the PTY only after approval.

