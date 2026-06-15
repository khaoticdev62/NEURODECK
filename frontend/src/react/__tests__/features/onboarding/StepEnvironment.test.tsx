import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  StepEnvironment,
  type InstallerProgressMap,
} from "../../../components/onboarding/steps/StepEnvironment";

const HEALTHY_DIAG = {
  pty_ok: true,
  pty_details: "PTY ready",
  network_ok: true,
  network_details: "Internet connected",
  keychain_ok: true,
  keychain_details: "Keychain active",
  audio_ok: true,
  audio_details: "Microphone detected",
  ssh_ok: true,
  ssh_details: "OpenSSH ready",
  tts_ok: true,
  tts_details: "espeak-ng ready",
};

const DEFAULT_PROGRESS: InstallerProgressMap = {
  ssh: { state: "idle" },
  tts: { state: "idle" },
  ollama: { state: "idle" },
  openvpn: { state: "idle" },
  wireguard: { state: "idle" },
};

const DEFAULT_PROPS = {
  diagnosticResult: HEALTHY_DIAG,
  diagnosticsLoading: false,
  ollamaInstalled: true,
  openvpnInstalled: true,
  wireguardInstalled: true,
  installerProgress: DEFAULT_PROGRESS,
  onRescan: vi.fn(),
  onInstall: vi.fn(),
  onCancelInstall: vi.fn(),
};

describe("StepEnvironment", () => {
  it("renders heading", () => {
    render(<StepEnvironment {...DEFAULT_PROPS} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeDefined();
  });

  it("shows loading spinner when diagnosticsLoading=true", () => {
    render(
      <StepEnvironment {...DEFAULT_PROPS} diagnosticsLoading={true} diagnosticResult={null} />
    );
    expect(screen.getByText(/scanning subsystem endpoints/i)).toBeDefined();
  });

  it("does not render diagnostic rows while loading", () => {
    render(
      <StepEnvironment {...DEFAULT_PROPS} diagnosticsLoading={true} diagnosticResult={null} />
    );
    expect(screen.queryByText("PTY Terminal Subsystem")).toBeNull();
  });

  it("renders all 9 diagnostic rows when data is present", () => {
    render(<StepEnvironment {...DEFAULT_PROPS} />);
    expect(screen.getByText("PTY Terminal Subsystem")).toBeDefined();
    expect(screen.getByText("Bridge Connection & Internet")).toBeDefined();
    expect(screen.getByText("Secure Credential Storage")).toBeDefined();
    expect(screen.getByText("Voice Input Devices")).toBeDefined();
    expect(screen.getByText("SSH Client Subsystem")).toBeDefined();
    expect(screen.getByText("TTS Speech Subsystem")).toBeDefined();
    expect(screen.getByText("Ollama AI Runtime")).toBeDefined();
    expect(screen.getByText("OpenVPN Client Subsystem")).toBeDefined();
    expect(screen.getByText("WireGuard Client Subsystem")).toBeDefined();
  });

  it("calls onRescan when Re-scan button is clicked", async () => {
    const onRescan = vi.fn();
    render(<StepEnvironment {...DEFAULT_PROPS} onRescan={onRescan} />);
    await userEvent.click(screen.getByRole("button", { name: /re-scan/i }));
    expect(onRescan).toHaveBeenCalledOnce();
  });

  it("rescan button is disabled while loading", () => {
    render(<StepEnvironment {...DEFAULT_PROPS} diagnosticsLoading={true} />);
    const btn = screen.getByRole("button", { name: /re-scan/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows Install Subsystem button for missing SSH", () => {
    const missingDiag = { ...HEALTHY_DIAG, ssh_ok: false, ssh_details: "OpenSSH not found" };
    render(<StepEnvironment {...DEFAULT_PROPS} diagnosticResult={missingDiag} />);
    const installButtons = screen.getAllByRole("button", { name: /install subsystem/i });
    expect(installButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onInstall with "ssh" when install button is clicked', async () => {
    const onInstall = vi.fn();
    const missingDiag = { ...HEALTHY_DIAG, ssh_ok: false, ssh_details: "OpenSSH not found" };
    render(
      <StepEnvironment {...DEFAULT_PROPS} diagnosticResult={missingDiag} onInstall={onInstall} />
    );
    await userEvent.click(screen.getAllByRole("button", { name: /install subsystem/i })[0]);
    expect(onInstall).toHaveBeenCalledWith("ssh");
  });

  it("shows download progress bar for downloading state", () => {
    const progressWithDownload: InstallerProgressMap = {
      ...DEFAULT_PROGRESS,
      ollama: { state: "downloading", percent: 42 },
    };
    render(
      <StepEnvironment
        {...DEFAULT_PROPS}
        ollamaInstalled={false}
        installerProgress={progressWithDownload}
      />
    );
    expect(screen.getByText("42% (0.0 MB/s)")).toBeDefined();
  });

  it("shows Cancel button during install", () => {
    const progressWithInstall: InstallerProgressMap = {
      ...DEFAULT_PROGRESS,
      ollama: { state: "installing" },
    };
    render(
      <StepEnvironment
        {...DEFAULT_PROPS}
        ollamaInstalled={false}
        installerProgress={progressWithInstall}
      />
    );
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDefined();
  });

  it("calls onCancelInstall when Cancel button clicked", async () => {
    const onCancelInstall = vi.fn();
    const progressWithInstall: InstallerProgressMap = {
      ...DEFAULT_PROGRESS,
      ollama: { state: "installing" },
    };
    render(
      <StepEnvironment
        {...DEFAULT_PROPS}
        ollamaInstalled={false}
        installerProgress={progressWithInstall}
        onCancelInstall={onCancelInstall}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancelInstall).toHaveBeenCalledWith("ollama");
  });

  it("shows Retry button on install failure", () => {
    const progressWithFail: InstallerProgressMap = {
      ...DEFAULT_PROGRESS,
      ollama: { state: "failed", error: "Network timeout" },
    };
    render(
      <StepEnvironment
        {...DEFAULT_PROPS}
        ollamaInstalled={false}
        installerProgress={progressWithFail}
      />
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    expect(screen.getByText(/network timeout/i)).toBeDefined();
  });

  it("does not show installer controls for already-installed deps", () => {
    render(<StepEnvironment {...DEFAULT_PROPS} ollamaInstalled={true} />);
    // When all installed, no "Install Subsystem" buttons should be present
    expect(screen.queryByRole("button", { name: /install subsystem/i })).toBeNull();
  });
});
