import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecoveryView } from "../../features/recovery/RecoveryView";
import type { NeuroDeckAppActions, NeuroDeckState } from "../../types/neurodeck";

const makeActions = (overrides: Partial<NeuroDeckAppActions> = {}): NeuroDeckAppActions => ({
  scanProject: vi.fn().mockResolvedValue(undefined),
  buildProjectContext: vi.fn().mockResolvedValue(undefined),
  detectModels: vi.fn().mockResolvedValue(undefined),
  checkAiHealth: vi.fn().mockResolvedValue(undefined),
  runAssistant: vi.fn().mockResolvedValue(undefined),
  runAgent: vi.fn().mockResolvedValue(undefined),
  refreshDiagnostics: vi.fn().mockResolvedValue(undefined),
  exportSession: vi.fn().mockResolvedValue(undefined),
  saveSession: vi.fn().mockResolvedValue(undefined),
  exportDiagnosticsBundle: vi.fn().mockResolvedValue(undefined),
  resetLocalState: vi.fn().mockResolvedValue(undefined),
  addMemoryFact: vi.fn().mockResolvedValue(undefined),
  deleteMemory: vi.fn().mockResolvedValue(undefined),
  toggleMemoryPin: vi.fn().mockResolvedValue(undefined),
  refreshModelScores: vi.fn().mockResolvedValue(undefined),
  refreshAgentPolicies: vi.fn().mockResolvedValue(undefined),
  refreshRecoveryEvents: vi.fn().mockResolvedValue(undefined),
  validateAgentModel: vi.fn().mockResolvedValue({ allowed: true, reason: "" }),
  ...overrides,
});

const makeState = (overrides: Partial<NeuroDeckState> = {}): NeuroDeckState =>
  ({
    lastError: null,
    recoveryEvents: [],
    diagnostics: null,
    aiHealth: [],
    diagnosticLogs: [],
    ...overrides,
  }) as unknown as NeuroDeckState;

const dispatch = vi.fn();

describe("RecoveryView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders with data-testid", () => {
    render(<RecoveryView state={makeState()} dispatch={dispatch} actions={makeActions()} />);
    expect(screen.getByTestId("recovery-view")).toBeDefined();
  });

  it('shows "No active errors" when lastError is null', () => {
    render(<RecoveryView state={makeState()} dispatch={dispatch} actions={makeActions()} />);
    expect(screen.getByText("No active errors")).toBeDefined();
  });

  it("shows error details when lastError is set", () => {
    const state = makeState({
      lastError: {
        title: "Bridge timeout",
        message: "The sidecar did not respond within 5s.",
        action: "Restart the bridge.",
      },
    });
    render(<RecoveryView state={state} dispatch={dispatch} actions={makeActions()} />);
    expect(screen.getByText("Bridge timeout")).toBeDefined();
    expect(screen.getByText(/sidecar did not respond/i)).toBeDefined();
  });

  it("shows empty state when no recovery events", () => {
    render(<RecoveryView state={makeState()} dispatch={dispatch} actions={makeActions()} />);
    expect(screen.getByText(/no recovery events logged yet/i)).toBeDefined();
  });

  it('renders recovery events list with role="log"', () => {
    const state = makeState({
      recoveryEvents: [
        {
          id: "ev1",
          action: "send_command",
          runtimeId: "ollama",
          modelId: "llama3",
          allowed: true,
          reason: "within quota",
          state: "healthy",
          timestamp: new Date().toISOString(),
        },
      ],
    });
    render(<RecoveryView state={state} dispatch={dispatch} actions={makeActions()} />);
    const log = screen.getByRole("log");
    expect(log).toBeDefined();
    expect(log.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText(/send_command/)).toBeDefined();
  });

  it("does NOT call resetLocalState on first click — shows confirm dialog", async () => {
    const resetLocalState = vi.fn().mockResolvedValue(undefined);
    render(
      <RecoveryView
        state={makeState()}
        dispatch={dispatch}
        actions={makeActions({ resetLocalState })}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /clear local state/i }));
    expect(resetLocalState).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("calls resetLocalState after confirm", async () => {
    const resetLocalState = vi.fn().mockResolvedValue(undefined);
    render(
      <RecoveryView
        state={makeState()}
        dispatch={dispatch}
        actions={makeActions({ resetLocalState })}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /clear local state/i }));
    await userEvent.click(screen.getByRole("button", { name: /clear state/i }));
    expect(resetLocalState).toHaveBeenCalledOnce();
  });

  it("closes dialog without calling reset when cancel clicked", async () => {
    const resetLocalState = vi.fn().mockResolvedValue(undefined);
    render(
      <RecoveryView
        state={makeState()}
        dispatch={dispatch}
        actions={makeActions({ resetLocalState })}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /clear local state/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(resetLocalState).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
