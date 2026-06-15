import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MaintenanceView } from "../../features/maintenance/MaintenanceView";
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
    diagnostics: null,
    aiHealth: [],
    diagnosticLogs: [],
    recoveryEvents: [],
    ...overrides,
  }) as unknown as NeuroDeckState;

describe("MaintenanceView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders with data-testid", () => {
    render(<MaintenanceView state={makeState()} actions={makeActions()} />);
    expect(screen.getByTestId("maintenance-view")).toBeDefined();
  });

  it("shows placeholder text when diagnostics is null", () => {
    render(<MaintenanceView state={makeState()} actions={makeActions()} />);
    expect(screen.getByText(/run a diagnostics refresh/i)).toBeDefined();
  });

  it("shows version info when diagnostics is populated", () => {
    const state = makeState({
      diagnostics: {
        electron: "28.0.0",
        chrome: "120.0.0",
        node: "20.0.0",
        platform: "linux",
        arch: "x64",
        packaged: false,
        schemaVersion: 3,
      } as unknown as NeuroDeckState["diagnostics"],
    });
    render(<MaintenanceView state={state} actions={makeActions()} />);
    expect(screen.getByText("28.0.0")).toBeDefined();
    expect(screen.getByText("linux/x64")).toBeDefined();
  });

  it("does NOT call resetLocalState on first click — shows confirm dialog", async () => {
    const resetLocalState = vi.fn().mockResolvedValue(undefined);
    render(<MaintenanceView state={makeState()} actions={makeActions({ resetLocalState })} />);
    await userEvent.click(screen.getByRole("button", { name: /clear local state/i }));
    expect(resetLocalState).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("calls resetLocalState after confirm", async () => {
    const resetLocalState = vi.fn().mockResolvedValue(undefined);
    render(<MaintenanceView state={makeState()} actions={makeActions({ resetLocalState })} />);
    await userEvent.click(screen.getByRole("button", { name: /clear local state/i }));
    await userEvent.click(screen.getByRole("button", { name: /clear state/i }));
    expect(resetLocalState).toHaveBeenCalledOnce();
  });

  it("does NOT call resetLocalState when cancel is clicked", async () => {
    const resetLocalState = vi.fn().mockResolvedValue(undefined);
    render(<MaintenanceView state={makeState()} actions={makeActions({ resetLocalState })} />);
    await userEvent.click(screen.getByRole("button", { name: /clear local state/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(resetLocalState).not.toHaveBeenCalled();
  });

  it("closes confirm dialog after cancel", async () => {
    render(<MaintenanceView state={makeState()} actions={makeActions()} />);
    await userEvent.click(screen.getByRole("button", { name: /clear local state/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("calls refreshDiagnostics on refresh button click", async () => {
    const refreshDiagnostics = vi.fn().mockResolvedValue(undefined);
    render(<MaintenanceView state={makeState()} actions={makeActions({ refreshDiagnostics })} />);
    await userEvent.click(screen.getByRole("button", { name: /refresh diagnostics/i }));
    expect(refreshDiagnostics).toHaveBeenCalledOnce();
  });

  it("calls exportDiagnosticsBundle on export button click", async () => {
    const exportDiagnosticsBundle = vi.fn().mockResolvedValue(undefined);
    render(
      <MaintenanceView state={makeState()} actions={makeActions({ exportDiagnosticsBundle })} />
    );
    await userEvent.click(screen.getByRole("button", { name: /export support bundle/i }));
    expect(exportDiagnosticsBundle).toHaveBeenCalledOnce();
  });
});
