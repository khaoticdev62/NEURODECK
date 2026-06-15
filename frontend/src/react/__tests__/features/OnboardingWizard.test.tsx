import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingModal } from "../../components/onboarding/OnboardingModal";

// Mock bridge adapter
const mockGetDiagnostics = vi.fn();
const mockRunDiagnostics = vi.fn();
const mockGetEnvironment = vi.fn();
const mockSpawn = vi.fn();
const mockKill = vi.fn();
const mockGetProviderHealth = vi.fn();
const mockSetConfig = vi.fn();
const mockSaveGeminiApiKey = vi.fn();
const mockSaveOpenAiCompatApiKey = vi.fn();
const mockStoreSet = vi.fn();
const mockPluginsList = vi.fn();
const mockPluginsValidate = vi.fn();
const mockGetDependencyStatus = vi.fn();
const mockInstallDependency = vi.fn();
const mockCancelDependency = vi.fn();
const mockDependencyOnProgress = vi.fn().mockReturnValue(() => {});
const mockNpmGetStatus = vi.fn();
const mockNpmGetRecommended = vi.fn();
const mockNpmInstall = vi.fn();
const mockNpmOnProgress = vi.fn().mockReturnValue(() => {});

vi.mock("../../services/bridgeAdapter", () => ({
  neurodeckApi: {
    diagnostics: {
      get: () => mockGetDiagnostics(),
      runOnboardingDiagnostics: () => mockRunDiagnostics(),
    },
    terminal: {
      getEnvironment: () => mockGetEnvironment(),
      spawn: (id: string) => mockSpawn(id),
      kill: (id: string) => mockKill(id),
    },
    models: {
      getProviderHealth: () => mockGetProviderHealth(),
    },
    store: {
      setConfig: (k: string, v: string) => mockSetConfig(k, v),
      saveGeminiApiKey: (k: string) => mockSaveGeminiApiKey(k),
      saveOpenAiCompatApiKey: (k: string) => mockSaveOpenAiCompatApiKey(k),
      set: (k: string, v: any) => mockStoreSet(k, v),
    },
    plugins: {
      list: () => mockPluginsList(),
      validate: (file: string) => mockPluginsValidate(file),
    },
    dependency: {
      getStatus: () => mockGetDependencyStatus(),
      install: (id: string) => mockInstallDependency(id),
      cancel: (id: string) => mockCancelDependency(id),
      onProgress: (cb: any) => mockDependencyOnProgress(cb),
    },
    npm: {
      getStatus: () => mockNpmGetStatus(),
      getRecommended: () => mockNpmGetRecommended(),
      install: (name: string) => mockNpmInstall(name),
      onProgress: (cb: any) => mockNpmOnProgress(cb),
    },
  },
  listenBridge: vi.fn().mockReturnValue(() => {}),
}));

// Mock useTheme hook
const mockUpdateSettings = vi.fn();
vi.mock("../../theme/useTheme", () => ({
  useTheme: () => ({
    availableThemes: [
      { id: "blacksite", name: "Blacksite" },
      { id: "hologrid", name: "Hologrid" },
    ],
    settings: {
      activeThemeId: "blacksite",
      fontScale: 100,
      compactMode: false,
      accessibilityProfile: "default",
    },
    updateSettings: mockUpdateSettings,
  }),
}));

const mockDispatch = vi.fn();
const mockState: any = {
  deckMode: false,
  plugins: [],
  agents: [],
  models: [],
  memories: [],
  messages: [],
};

describe("OnboardingWizard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDiagnostics.mockResolvedValue({ appVersion: "1.8.0" });
    mockGetEnvironment.mockResolvedValue({ steamDeckHost: false });
    mockSpawn.mockResolvedValue({ success: true });
    mockKill.mockResolvedValue({ success: true });
    mockRunDiagnostics.mockResolvedValue({
      pty_ok: true,
      network_ok: true,
      network_details: "Internet connected",
      keychain_ok: true,
      keychain_details: "Keychain ready",
      audio_ok: true,
      audio_details: "Microphone found",
      ssh_ok: true,
      ssh_details: "OpenSSH ready",
      tts_ok: true,
      tts_details: "TTS ready",
    });
    mockGetProviderHealth.mockResolvedValue([
      { runtime_type: "ollama", state: "connected", models: ["llama3"] },
    ]);
    mockPluginsList.mockResolvedValue({ plugins: [] });
    mockGetDependencyStatus.mockResolvedValue({
      ssh: true,
      ollama: true,
      tts: true,
      openvpn: true,
      wireguard: true,
    });
    mockNpmGetStatus.mockResolvedValue({
      node: true,
      npm: true,
      nodeVersion: "v20.0.0",
      npmVersion: "10.0.0",
    });
    mockNpmGetRecommended.mockResolvedValue([]);
  });

  it("performs precheck and shows Skip for Now button if diagnostics are healthy", async () => {
    render(<OnboardingModal state={mockState} dispatch={mockDispatch} />);

    // Wait for precheck to resolve
    await waitFor(() => {
      expect(
        screen.getByText("Basic diagnostic requirements passing. You can safely skip setup.")
      ).toBeDefined();
    });

    const skipButton = screen.getByRole("button", { name: /skip for now/i });
    expect(skipButton).toBeDefined();

    // Clicking Skip for Now should trigger dismiss and storage save
    await userEvent.click(skipButton);
    expect(mockStoreSet).toHaveBeenCalledWith(
      "neurodeck_onboarding_state",
      expect.objectContaining({
        status: "skipped",
      })
    );
    expect(mockDispatch).toHaveBeenCalledWith({ type: "close-onboarding" });
  });

  it("still offers Skip for Now button even if precheck fails", async () => {
    // Make spawn fail
    mockSpawn.mockResolvedValue({ success: false });

    render(<OnboardingModal state={mockState} dispatch={mockDispatch} />);

    await waitFor(() => {
      expect(
        screen.getByText("Initial environment issue detected. Setup recommended before launching.")
      ).toBeDefined();
    });

    const skipButton = screen.queryByRole("button", { name: /skip for now/i });
    expect(skipButton).toBeDefined();
  });

  it("navigates through steps to save preferences and complete setup", async () => {
    render(<OnboardingModal state={mockState} dispatch={mockDispatch} />);

    await waitFor(() => screen.getByRole("button", { name: /next/i }));

    // --- STEP 1 -> STEP 2 (Environment) ---
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText("Environment Integrity Check")).toBeDefined();
    });
    expect(mockRunDiagnostics).toHaveBeenCalled();

    // --- STEP 2 -> STEP 3 (Models) ---
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText("AI Provider Setup")).toBeDefined();
    });

    // Test model connection
    const testBtn = screen.getByRole("button", { name: /test connection/i });
    await userEvent.click(testBtn);
    await waitFor(() => {
      expect(screen.getByText(/successfully connected to/i)).toBeDefined();
    });

    // --- STEP 3 -> STEP 4 (Preferences) ---
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText("Preferences & Styling")).toBeDefined();
    });

    // Select Hologrid Theme
    const selectTheme = screen.getByRole("combobox");
    await userEvent.selectOptions(selectTheme, "hologrid");

    // --- STEP 4 -> STEP 5 (Plugins) ---
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText("Script Automation & Plugins")).toBeDefined();
    });

    // --- STEP 5 -> STEP 6 (Packages) ---
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText("Recommended Packages")).toBeDefined();
    });

    // --- STEP 6 -> STEP 7 (Finish) ---
    await userEvent.click(screen.getByRole("button", { name: /skip packages/i }));
    await waitFor(() => {
      expect(screen.getByText("Setup Finalization")).toBeDefined();
    });

    // Click Enter Workspace
    await userEvent.click(screen.getByRole("button", { name: /enter workspace/i }));
    expect(mockStoreSet).toHaveBeenCalledWith(
      "neurodeck_onboarding_state",
      expect.objectContaining({
        status: "completed",
      })
    );
    expect(mockDispatch).toHaveBeenCalledWith({ type: "close-onboarding" });
  });

  it("renders installer controls for missing dependencies and starts install", async () => {
    mockRunDiagnostics.mockResolvedValue({
      pty_ok: true,
      network_ok: true,
      network_details: "Internet connected",
      keychain_ok: true,
      keychain_details: "Keychain ready",
      audio_ok: true,
      audio_details: "Microphone found",
      ssh_ok: false,
      ssh_details: "OpenSSH not found",
      tts_ok: true,
      tts_details: "TTS ready",
    });
    mockGetDependencyStatus.mockResolvedValue({
      ssh: false,
      ollama: false,
      tts: true,
      openvpn: false,
      wireguard: false,
    });

    render(<OnboardingModal state={mockState} dispatch={mockDispatch} />);

    await waitFor(() => screen.getByRole("button", { name: /next/i }));
    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText("Environment Integrity Check")).toBeDefined();
    });

    const installButtons = screen.getAllByRole("button", { name: /install subsystem/i });
    expect(installButtons.length).toBeGreaterThanOrEqual(1);

    mockInstallDependency.mockResolvedValue({ success: true });
    await userEvent.click(installButtons[0]);

    expect(mockInstallDependency).toHaveBeenCalledWith("ssh");
  });
});
