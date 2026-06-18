import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";

const { mockList, mockAdd, mockToggle, mockDelete, mockRun } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockAdd: vi.fn(),
  mockToggle: vi.fn(),
  mockDelete: vi.fn(),
  mockRun: vi.fn(),
}));

vi.mock("../../services/bridgeAdapter", () => ({
  neurodeckApi: {
    scheduler: {
      listTasks: mockList,
      addTask: mockAdd,
      toggleTask: mockToggle,
      deleteTask: mockDelete,
      runTaskNow: mockRun,
    },
  },
}));

import { SchedulerView } from "../../features/scheduler/SchedulerView";

const TASK = {
  id: "task-1",
  name: "Morning Report",
  cron: "0 9 * * MON",
  goal: "Generate weekly summary",
  enabled: true,
  next_run: null,
  last_run: null,
};

describe("SchedulerView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
    mockAdd.mockResolvedValue({ ...TASK, id: "task-new" });
    mockToggle.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
    mockRun.mockResolvedValue({});
  });

  it("renders with data-testid", async () => {
    render(<SchedulerView />);
    expect(screen.getByTestId("scheduler-view")).toBeDefined();
    await waitFor(() => expect(mockList).toHaveBeenCalled());
  });

  it("shows empty state when no tasks", async () => {
    render(<SchedulerView />);
    await waitFor(() => expect(screen.getByText(/no scheduled tasks/i)).toBeDefined());
  });

  it("Add Task button is disabled when name and cron are empty", () => {
    render(<SchedulerView />);
    const btn = screen.getByRole("button", { name: /add task/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("Add Task button is disabled when name is filled but cron is cleared", async () => {
    render(<SchedulerView />);
    // Cron defaults to '0 9 * * MON'; clear it so only name is filled
    fireEvent.change(screen.getByRole("textbox", { name: /cron expression/i }), {
      target: { value: "" },
    });
    await userEvent.type(screen.getByRole("textbox", { name: /task name/i }), "My Task");
    const btn = screen.getByRole("button", { name: /add task/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("Add Task button is enabled when name is filled (cron has default value)", async () => {
    render(<SchedulerView />);
    // Cron already defaults to '0 9 * * MON', so typing name is sufficient to enable
    await userEvent.type(screen.getByRole("textbox", { name: /task name/i }), "My Task");
    const btn = screen.getByRole("button", { name: /add task/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it("calls scheduler.add and refreshes list when form submitted", async () => {
    mockList.mockResolvedValueOnce([]).mockResolvedValueOnce([TASK]);
    render(<SchedulerView />);
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    await userEvent.type(screen.getByRole("textbox", { name: /task name/i }), "Morning Report");
    // Cron already has default; set it explicitly to the desired value via fireEvent.change
    fireEvent.change(screen.getByRole("textbox", { name: /cron expression/i }), {
      target: { value: "0 9 * * MON" },
    });
    await userEvent.click(screen.getByRole("button", { name: /add task/i }));

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Morning Report", cron: "0 9 * * MON" })
    );
    await waitFor(() => expect(screen.getByText("Morning Report")).toBeDefined());
  });

  it("pause/resume toggle has correct aria-pressed for enabled task", async () => {
    mockList.mockResolvedValue([TASK]);
    render(<SchedulerView />);
    await waitFor(() => expect(screen.getByText("Morning Report")).toBeDefined());
    const toggleBtn = screen.getByRole("button", { name: /pause task \(currently enabled\)/i });
    expect(toggleBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("pause/resume toggle has aria-pressed=false for disabled task", async () => {
    mockList.mockResolvedValue([{ ...TASK, enabled: false }]);
    render(<SchedulerView />);
    await waitFor(() => expect(screen.getByText("Morning Report")).toBeDefined());
    const toggleBtn = screen.getByRole("button", { name: /resume task \(currently paused\)/i });
    expect(toggleBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("calls scheduler.toggle when pause/resume clicked", async () => {
    mockList.mockResolvedValue([TASK]);
    render(<SchedulerView />);
    await waitFor(() => expect(screen.getByText("Morning Report")).toBeDefined());
    await userEvent.click(screen.getByRole("button", { name: /pause task/i }));
    expect(mockToggle).toHaveBeenCalledWith("task-1");
  });

  it("calls scheduler.delete when delete button clicked", async () => {
    mockList.mockResolvedValue([TASK]);
    render(<SchedulerView />);
    await waitFor(() => expect(screen.getByText("Morning Report")).toBeDefined());
    await userEvent.click(screen.getByRole("button", { name: /delete task/i }));
    expect(mockDelete).toHaveBeenCalledWith("task-1");
  });

  it("calls scheduler.run when run now clicked", async () => {
    mockList.mockResolvedValue([TASK]);
    render(<SchedulerView />);
    await waitFor(() => expect(screen.getByText("Morning Report")).toBeDefined());
    await userEvent.click(screen.getByRole("button", { name: /run task now/i }));
    expect(mockRun).toHaveBeenCalledWith("task-1");
  });
});
