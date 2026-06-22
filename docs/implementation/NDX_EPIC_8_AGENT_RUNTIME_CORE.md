# Epic 8: Agent Runtime Core

## Sprint scope

This sprint item implements the persisted, bounded Agent Runtime core. It intentionally stops before IPC, UI, or tool execution.

## Delivered

- Stable agent definitions with name, role, goal, workspace scope, model profile, tool allowlist, permission ceiling, and resource limits.
- Persisted agent runs and event timelines.
- Real planning through Epic 9 `ModelRouter.complete()`.
- Provider-request cancellation through `AbortSignal`.
- Timeout and token limits.
- Visible planning, cancelling, cancelled, completed, and failed transitions.
- Provider/model identity and reported token usage recorded with completed runs.

## Safety boundary

This runtime asks the model for a plan only. It explicitly instructs the model not to claim tool execution or file modification. No tool call is executed in this slice, so the model cannot bypass the existing ToolRegistry, PermissionBroker, ActionQueue, approval, audit, and recovery pipeline. That integration is the next sprint item.

## Verification

- Completion lifecycle persists real output and usage.
- Cancellation aborts the model request and preserves the full timeline.
- Agent and model focused tests: 14 passed.
- Full TypeScript checks and lint pass.

## Next sprint item

Add typed IPC and connect approved plan steps to the existing ActionQueue. Then build ND-016 and ND-017 against the real persisted runtime.
