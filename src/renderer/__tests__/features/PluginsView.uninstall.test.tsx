import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockList, mockUninstall, mockReload } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockUninstall: vi.fn(),
  mockReload: vi.fn(),
}));

vi.mock("../../services/bridgeAdapter", () => ({
  neurodeckApi: {
    plugins: {
      list: mockList,
      uninstall: mockUninstall,
      reload: mockReload,
      toggle: vi.fn().mockResolvedValue({}),
      installFromUrl: vi.fn().mockResolvedValue({}),
    },
  },
  listenBridge: vi.fn().mockReturnValue(() => {}),
}));

import { PluginsView } from "../../features/plugins/PluginsView";

const PLUGIN = {
  id: "my-plugin",
  file_name: "my-plugin.lua",
  name: "My Plugin",
  description: "Test plugin",
  enabled: true,
  author: "Dev",
  version: "1.0.0",
  tags: [],
  marketplace: false,
  permissions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue({ plugins: [PLUGIN] });
  mockUninstall.mockResolvedValue({});
  mockReload.mockResolvedValue({});
});

describe("PluginsView — uninstall confirm flow", () => {
  it("renders the plugin name after loading", async () => {
    render(<PluginsView />);
    await waitFor(() => expect(screen.getByText("My Plugin")).toBeDefined());
  });

  it("does NOT call uninstall immediately when Uninstall button is clicked", async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText("My Plugin"));

    const uninstallBtn = screen.getByRole("button", { name: /uninstall my plugin/i });
    await userEvent.click(uninstallBtn);

    expect(mockUninstall).not.toHaveBeenCalled();
  });

  it("shows a ConfirmDialog after clicking Uninstall", async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText("My Plugin"));

    await userEvent.click(screen.getByRole("button", { name: /uninstall my plugin/i }));

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Uninstall plugin?")).toBeDefined();
  });

  it("cancels without calling uninstall when Cancel is clicked", async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText("My Plugin"));

    await userEvent.click(screen.getByRole("button", { name: /uninstall my plugin/i }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockUninstall).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("calls uninstall with the plugin id when Confirm is clicked", async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText("My Plugin"));

    await userEvent.click(screen.getByRole("button", { name: /uninstall my plugin/i }));
    await userEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    await waitFor(() => expect(mockUninstall).toHaveBeenCalledWith("my-plugin"));
  });

  it("closes the dialog after confirming uninstall", async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText("My Plugin"));

    await userEvent.click(screen.getByRole("button", { name: /uninstall my plugin/i }));
    await userEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("calls reload after a successful uninstall", async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText("My Plugin"));

    await userEvent.click(screen.getByRole("button", { name: /uninstall my plugin/i }));
    await userEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    await waitFor(() => expect(mockReload).toHaveBeenCalledOnce());
  });

  it("cancels with Escape key and does not call uninstall", async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText("My Plugin"));

    await userEvent.click(screen.getByRole("button", { name: /uninstall my plugin/i }));
    await userEvent.keyboard("{Escape}");

    expect(mockUninstall).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
