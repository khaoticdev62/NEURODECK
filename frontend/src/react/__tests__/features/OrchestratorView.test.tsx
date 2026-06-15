import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockList, mockLoad, mockImport, mockExport, mockSave, mockDelete, mockRun, mockStop } =
  vi.hoisted(() => ({
    mockList: vi.fn(),
    mockLoad: vi.fn(),
    mockImport: vi.fn(),
    mockExport: vi.fn(),
    mockSave: vi.fn(),
    mockDelete: vi.fn(),
    mockRun: vi.fn(),
    mockStop: vi.fn(),
  }));

vi.mock("../../services/bridgeAdapter", () => ({
  neurodeckApi: {
    workflow: {
      list: mockList,
      load: mockLoad,
      importJson: mockImport,
      export: mockExport,
      save: mockSave,
      delete: mockDelete,
      run: mockRun,
      stop: mockStop,
    },
  },
  listenBridge: vi.fn().mockReturnValue(() => {}),
}));

import { OrchestratorView } from "../../features/orchestrator/OrchestratorView";

const SAMPLE_SUMMARY = { name: "my-workflow", description: "A workflow", step_count: 2 };
const SAMPLE_DOC = {
  name: "my-workflow",
  nodes: [
    { id: "step-1", type: "trigger", config: {} },
    { id: "step-2", type: "prompt", config: {} },
  ],
  edges: [{ id: "e1", from: "step-1", fromPort: "out", to: "step-2" }],
};

describe("OrchestratorView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
    mockLoad.mockResolvedValue(SAMPLE_DOC);
    mockImport.mockResolvedValue(SAMPLE_SUMMARY);
    mockExport.mockResolvedValue("{}");
    mockSave.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
    mockRun.mockResolvedValue({});
    mockStop.mockResolvedValue({});
  });

  it("renders with data-testid", async () => {
    render(<OrchestratorView />);
    expect(screen.getByTestId("orchestrator-view")).toBeDefined();
    await waitFor(() => expect(mockList).toHaveBeenCalled());
  });

  it("shows empty workflow state when no workflows", async () => {
    render(<OrchestratorView />);
    await waitFor(() => expect(screen.getByText(/no workflows yet/i)).toBeDefined());
  });

  it("shows workflow list when workflows are loaded", async () => {
    mockList.mockResolvedValue([SAMPLE_SUMMARY]);
    render(<OrchestratorView />);
    await waitFor(() => expect(screen.getByText("my-workflow")).toBeDefined());
  });

  it("does NOT call window.prompt — uses modal for import", async () => {
    // Ensure window.prompt is a spy so we can assert it wasn't called
    window.prompt = vi.fn();
    render(<OrchestratorView />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: /import/i }));
    expect(window.prompt).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("import modal has accessible title and textarea", async () => {
    render(<OrchestratorView />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: /import/i }));
    expect(screen.getByRole("heading", { name: /import workflow json/i })).toBeDefined();
    expect(screen.getByLabelText(/paste workflow json/i)).toBeDefined();
  });

  it("import modal closes on Cancel click", async () => {
    render(<OrchestratorView />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: /import/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("import modal closes on Escape key", async () => {
    render(<OrchestratorView />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: /import/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    // Fire keyDown directly on the dialog element (onKeyDown is on the overlay div)
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("Import button in modal is disabled when textarea is empty", async () => {
    render(<OrchestratorView />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: /import/i }));
    const dialog = screen.getByRole("dialog");
    // Scope to dialog to avoid matching the toolbar Import button
    const importBtn = within(dialog).getByRole("button", { name: /^import$/i });
    expect((importBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls workflow.importJson with pasted JSON and closes modal", async () => {
    mockList.mockResolvedValue([SAMPLE_SUMMARY]);
    render(<OrchestratorView />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: /import/i }));
    const textarea = screen.getByLabelText(/paste workflow json/i);
    // Use fireEvent.change to avoid userEvent special-char escaping for {} and []
    fireEvent.change(textarea, {
      target: { value: '{"name":"my-workflow","nodes":[],"edges":[]}' },
    });
    const dialog = screen.getByRole("dialog");
    const importBtn = within(dialog).getByRole("button", { name: /^import$/i });
    await userEvent.click(importBtn);
    expect(mockImport).toHaveBeenCalledWith(expect.stringContaining("my-workflow"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("workflow graph SVG has role=img and aria-label", async () => {
    mockList.mockResolvedValue([SAMPLE_SUMMARY]);
    render(<OrchestratorView />);
    await waitFor(() => expect(screen.getByText("my-workflow")).toBeDefined());
    await userEvent.click(screen.getByText("my-workflow"));
    await waitFor(() => expect(mockLoad).toHaveBeenCalled());
    const svg = document.querySelector('svg[role="img"]');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-label")).toMatch(/workflow graph/i);
  });
});
