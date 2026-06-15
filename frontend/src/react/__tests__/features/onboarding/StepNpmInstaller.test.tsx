import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepNpmInstaller } from "../../../components/onboarding/steps/StepNpmInstaller";
import type { NpmInstallProgress } from "../../../types/neurodeck";

const mockGetStatus = vi.fn();
const mockList = vi.fn();
const mockInstall = vi.fn();
const mockOnProgress = vi.fn().mockReturnValue(() => {});

vi.mock("../../../services/bridgeAdapter", () => ({
  neurodeckApi: {
    npm: {
      getStatus: () => mockGetStatus(),
      list: () => mockList(),
      install: (name: string, version?: string) => mockInstall(name, version),
      onProgress: (cb: (data: NpmInstallProgress) => void) => mockOnProgress(cb),
    },
  },
}));

describe("StepNpmInstaller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStatus.mockResolvedValue({
      node: true,
      npm: true,
      nodeVersion: "v20.0.0",
      npmVersion: "10.0.0",
    });
    mockList.mockResolvedValue([
      { name: "typescript-language-server", installedVersion: "4.3.3", enabled: true },
    ]);
    mockInstall.mockResolvedValue({ name: "vite", installedVersion: "8.0.16", enabled: true });
  });

  it("renders runtime status and installed packages", async () => {
    render(<StepNpmInstaller />);

    await waitFor(() => expect(screen.getByText(/Node v20\.0\.0/i)).toBeDefined());
    expect(screen.getByText(/npm 10\.0\.0/i)).toBeDefined();
    expect(screen.getByText("typescript-language-server")).toBeDefined();
  });

  it("shows a truthful blocked state when node and npm are unavailable", async () => {
    mockGetStatus.mockResolvedValue({ node: false, npm: false });
    mockList.mockResolvedValue([]);

    render(<StepNpmInstaller />);

    await waitFor(() => expect(screen.getByText(/Node\.js and npm are required/i)).toBeDefined());
    expect(
      screen.getByRole("button", { name: /install npm package/i }).hasAttribute("disabled")
    ).toBe(true);
  });

  it("installs a manually entered package and optional version", async () => {
    render(<StepNpmInstaller />);

    await waitFor(() => expect(screen.getByLabelText(/Package/i)).toBeDefined());
    await userEvent.type(
      screen.getByLabelText(/Package/i),
      "@modelcontextprotocol/server-filesystem"
    );
    await userEvent.type(screen.getByLabelText(/Version/i), "1.2.3");
    await userEvent.click(
      screen.getByRole("button", { name: /install @modelcontextprotocol\/server-filesystem/i })
    );

    await waitFor(() => {
      expect(mockInstall).toHaveBeenCalledWith("@modelcontextprotocol/server-filesystem", "1.2.3");
    });
  });

  it("subscribes to progress events and cleans up on unmount", async () => {
    const cleanup = vi.fn();
    mockOnProgress.mockReturnValue(cleanup);

    const { unmount } = render(<StepNpmInstaller />);

    await waitFor(() => expect(mockOnProgress).toHaveBeenCalled());
    unmount();
    expect(cleanup).toHaveBeenCalled();
  });
});
