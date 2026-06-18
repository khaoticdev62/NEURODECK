import { useCallback, useEffect, useReducer, useRef, useState, type Dispatch } from "react";
import { Check, Rocket, ArrowLeft, ArrowRight } from "lucide-react";
import { neurodeckApi } from "../../services/bridgeAdapter";
import { useControllerAction } from "../../input/controller/useControllerAction";
import { useTheme } from "../../theme/useTheme";
import type { NeuroDeckState, NeuroDeckAction, AIProvider, ThemeName } from "../../types/neurodeck";
import type {
  OnboardingStep,
  SetupWarning,
  SetupError,
  OnboardingDiagnosticResult,
} from "../../types/onboarding";
import { StepWelcome } from "./steps/StepWelcome";
import {
  StepEnvironment,
  type InstallerItemState,
  type InstallerProgressMap,
} from "./steps/StepEnvironment";
import { StepModels } from "./steps/StepModels";
import { StepPreferences } from "./steps/StepPreferences";
import { StepPlugins } from "./steps/StepPlugins";
import { StepNpmInstaller } from "./steps/StepNpmInstaller";
import { StepPackages } from "./steps/StepPackages";
import { StepFinish } from "./steps/StepFinish";
import { OnboardingOverlay } from "../../onboarding/OnboardingOverlay";
import { Button } from "../primitives/Button";

// ─── Constants ────────────────────────────────────────────────────────────────

const ONBOARDING_STORE_KEY = "neurodeck_onboarding_state";
const LEGACY_COMPLETE_KEY = "neurodeck_onboarding_complete";

const FOCUSABLE_ELEMENTS = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface StepDef {
  id: OnboardingStep;
  label: string;
}

const STEPS: StepDef[] = [
  { id: "welcome", label: "Welcome" },
  { id: "environment", label: "Environment" },
  { id: "npm", label: "NPM Installer" },
  { id: "models", label: "AI Model Connection" },
  { id: "preferences", label: "Preferences" },
  { id: "plugins", label: "Plugins" },
  { id: "packages", label: "Packages" },
  { id: "finish", label: "Finish" },
];

// ─── Wizard Navigation Reducer ────────────────────────────────────────────────

interface WizardNav {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
}

type WizardNavAction =
  | { type: "go-to"; step: OnboardingStep }
  | { type: "complete-and-advance" }
  | { type: "back" };

function wizardReducer(state: WizardNav, action: WizardNavAction): WizardNav {
  switch (action.type) {
    case "go-to":
      return { ...state, currentStep: action.step };
    case "complete-and-advance": {
      const idx = STEPS.findIndex((s) => s.id === state.currentStep);
      const completed = [
        ...state.completedSteps.filter((s) => s !== state.currentStep),
        state.currentStep,
      ];
      const nextStep = idx < STEPS.length - 1 ? STEPS[idx + 1].id : state.currentStep;
      return { currentStep: nextStep, completedSteps: completed };
    }
    case "back": {
      const idx = STEPS.findIndex((s) => s.id === state.currentStep);
      return idx > 0 ? { ...state, currentStep: STEPS[idx - 1].id } : state;
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type OnboardingModalProps = {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
};

export function OnboardingModal({ state, dispatch }: OnboardingModalProps) {
  if (state.onboardingMode && state.onboardingMode !== "setup") {
    return <OnboardingOverlay mode={state.onboardingMode} state={state} dispatch={dispatch} />;
  }

  return <SetupOnboardingModal state={state} dispatch={dispatch} />;
}

function SetupOnboardingModal({ state, dispatch }: OnboardingModalProps) {
  const { availableThemes, settings, updateSettings } = useTheme();

  const [wizard, wizardDispatch] = useReducer(wizardReducer, {
    currentStep: "welcome",
    completedSteps: [],
  });
  const { currentStep, completedSteps } = wizard;

  // Welcome step
  const [precheckPassed, setPrecheckPassed] = useState(false);
  const [prechecking, setPrechecking] = useState(true);
  const [isSteamDeck, setIsSteamDeck] = useState(false);
  const [appVersion, setAppVersion] = useState("1.8.0");

  // Environment step
  const [diagnosticResult, setDiagnosticResult] = useState<OnboardingDiagnosticResult | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsErrors, setDiagnosticsErrors] = useState<SetupError[]>([]);
  const [diagnosticsWarnings, setDiagnosticsWarnings] = useState<SetupWarning[]>([]);
  const [ollamaInstalled, setOllamaInstalled] = useState(false);
  const [openvpnInstalled, setOpenvpnInstalled] = useState(false);
  const [wireguardInstalled, setWireguardInstalled] = useState(false);
  const [installerProgress, setInstallerProgress] = useState<InstallerProgressMap>({
    ssh: { state: "idle" },
    tts: { state: "idle" },
    ollama: { state: "idle" },
    openvpn: { state: "idle" },
    wireguard: { state: "idle" },
  });

  // Models step
  const [providerType, setProviderType] = useState<AIProvider | "skip">("ollama");
  const [endpointUrl, setEndpointUrl] = useState("http://127.0.0.1:11434");
  const [modelId, setModelId] = useState("llama3");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Preferences step
  const [themeId, setThemeId] = useState(settings.activeThemeId);
  const [fontScale, setFontScale] = useState(settings.fontScale);
  const [compactMode, setCompactMode] = useState(settings.compactMode);
  const [reducedMotion, setReducedMotion] = useState(
    settings.accessibilityProfile === "reduced_motion"
  );

  // Plugins step
  const [pluginStats, setPluginStats] = useState({
    installed: 0,
    active: 0,
    disabled: 0,
    errors: 0,
  });
  const [pluginsLoading, setPluginsLoading] = useState(false);

  const wizardRef = useRef<HTMLDivElement>(null);

  // ─── Data loaders ─────────────────────────────────────────────────────────

  const runPrecheck = useCallback(async () => {
    setPrechecking(true);
    try {
      const health = await neurodeckApi.diagnostics.get();
      if (!health.appVersion) throw new Error("Bridge connection is offline");
      setAppVersion(health.appVersion);
      const env = await neurodeckApi.terminal.getEnvironment();
      setIsSteamDeck(env.steamDeckHost);
      const ptyRes = await neurodeckApi.terminal.spawn("precheck_test");
      if (!ptyRes?.success) throw new Error("PTY spawn failed");
      await neurodeckApi.terminal.kill("precheck_test");
      setPrecheckPassed(true);
    } catch (_) {
      setPrecheckPassed(false);
    } finally {
      setPrechecking(false);
    }
  }, []);

  const runDiagnostics = useCallback(async () => {
    setDiagnosticsLoading(true);
    setDiagnosticsErrors([]);
    setDiagnosticsWarnings([]);
    try {
      const res = await neurodeckApi.diagnostics.runOnboardingDiagnostics();
      setDiagnosticResult(res);

      let status = { ssh: false, ollama: false, tts: false, openvpn: false, wireguard: false };
      if (neurodeckApi.dependency?.getStatus) {
        try {
          status = await neurodeckApi.dependency.getStatus();
          setOllamaInstalled(status.ollama);
          setOpenvpnInstalled(status.openvpn);
          setWireguardInstalled(status.wireguard);
        } catch (_) {}
      }

      const errors: SetupError[] = [];
      const warnings: SetupWarning[] = [];

      if (!res.pty_ok) {
        errors.push({
          code: "PTY_FAIL",
          message: "PTY Terminal Subsystem failed to spawn.",
          fix: "Ensure shell terminal binary access permissions are configured correctly.",
        });
      }
      if (!res.network_ok) {
        if (res.network_details.includes("restricted")) {
          warnings.push({
            code: "API_RESTRICTED",
            message: "Internet active, but Gemini Cloud API endpoints are restricted.",
            fix: "Check proxy settings, firewall rules, or DNS configuration.",
          });
        } else {
          errors.push({
            code: "NET_DOWN",
            message: "Network connection unreachable.",
            fix: "Check local router connections, wireless switches, or network cables.",
          });
        }
      }
      if (!res.keychain_ok)
        warnings.push({
          code: "KEYCHAIN_FAIL",
          message: "System keychain / secure credential storage is unavailable.",
          fix: "Ollama works, but Gemini API keys will fall back to local storage.",
        });
      if (!res.audio_ok)
        warnings.push({
          code: "AUDIO_UNAVAILABLE",
          message: "No active audio input device detected.",
          fix: "Voice command STT capabilities require an active microphone input.",
        });
      if (!res.ssh_ok)
        warnings.push({
          code: "SSH_MISSING",
          message: "SSH client binary was not found in system PATH.",
          fix: "Remote SSH connections and secure loopback tunnel services require OpenSSH.",
        });
      if (!res.tts_ok)
        warnings.push({
          code: "TTS_MISSING",
          message: "No supported Speech Synthesis TTS engine discovered.",
          fix: "Voice responses require espeak-ng (Linux) or Windows SAPI.",
        });
      if (!status.openvpn)
        warnings.push({
          code: "OPENVPN_MISSING",
          message: "OpenVPN client binary was not found in system PATH.",
          fix: "VPN connections via OpenVPN require the OpenVPN client binary.",
        });
      if (!status.wireguard)
        warnings.push({
          code: "WIREGUARD_MISSING",
          message: "WireGuard client binary was not found in system PATH.",
          fix: "VPN connections via WireGuard require the WireGuard client binary.",
        });

      setDiagnosticsErrors(errors);
      setDiagnosticsWarnings(warnings);
    } catch (e) {
      setDiagnosticsErrors([
        {
          code: "DIAG_CRASH",
          message: `Diagnostics crashed: ${String(e)}`,
          fix: "Restart bridge server sidecar and try again.",
        },
      ]);
    } finally {
      setDiagnosticsLoading(false);
    }
  }, []);

  const testModelConnection = async () => {
    if (providerType === "skip") {
      setTestResult({
        success: true,
        message: "Offline planning selected. Connection test skipped.",
      });
      return;
    }
    setTestingConnection(true);
    setTestResult(null);
    const backendProvider = providerType === "lmstudio" ? "openai_compat" : providerType;
    try {
      if (backendProvider === "ollama") {
        await neurodeckApi.store.setConfig("llm.ollama_base_url", endpointUrl);
        await neurodeckApi.store.setConfig("llm.ollama_model", modelId);
      } else if (backendProvider === "openai_compat") {
        await neurodeckApi.store.setConfig("llm.openai_compat_base_url", endpointUrl);
        await neurodeckApi.store.setConfig("llm.openai_compat_model", modelId);
        if (apiKey) await neurodeckApi.store.saveOpenAiCompatApiKey(apiKey);
      }
      await neurodeckApi.store.setConfig("llm.default_provider", backendProvider);
      const healthList = await neurodeckApi.models.getProviderHealth();
      const match = healthList.find(
        (h) =>
          h.runtime_type ===
          (backendProvider === "openai_compat" ? "openai-compatible-remote" : "ollama")
      );
      if (match?.state === "connected") {
        setTestResult({
          success: true,
          message: `Successfully connected to ${providerType === "lmstudio" ? "LM Studio" : providerType.toUpperCase()}. Found models: ${match.models.join(", ") || "none"}`,
        });
      } else {
        setTestResult({
          success: false,
          message: `Connection timed out or returned offline: ${match?.error || match?.state || "Unknown response"}`,
        });
      }
    } catch (e) {
      setTestResult({
        success: false,
        message: `Connection failed: ${String(e)}. Double check endpoint URL and server status.`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const loadPluginsCheck = async () => {
    setPluginsLoading(true);
    try {
      const res = await neurodeckApi.plugins.list();
      const list = res.plugins || [];
      let errCount = 0;
      for (const p of list) {
        try {
          const report = await neurodeckApi.plugins.validate(p.file_name);
          if (!report.passed) errCount++;
        } catch (_) {}
      }
      setPluginStats({
        installed: list.length,
        active: list.filter((p) => p.enabled).length,
        disabled: list.filter((p) => !p.enabled).length,
        errors: errCount,
      });
    } catch (_) {
      setPluginStats({ installed: 0, active: 0, disabled: 0, errors: 0 });
    } finally {
      setPluginsLoading(false);
    }
  };

  // ─── Save helpers ─────────────────────────────────────────────────────────

  const saveModels = async () => {
    const backendProvider = providerType === "lmstudio" ? "openai_compat" : providerType;
    if (backendProvider !== "skip") {
      await neurodeckApi.store.setConfig("llm.default_provider", backendProvider);
      if (backendProvider === "ollama") {
        await neurodeckApi.store.setConfig("llm.ollama_base_url", endpointUrl);
        await neurodeckApi.store.setConfig("llm.ollama_model", modelId);
        dispatch({ type: "set-provider", provider: "ollama" });
        dispatch({ type: "set-selected-model", id: modelId });
      } else if (backendProvider === "openai_compat") {
        await neurodeckApi.store.setConfig("llm.openai_compat_base_url", endpointUrl);
        await neurodeckApi.store.setConfig("llm.openai_compat_model", modelId);
        if (apiKey) await neurodeckApi.store.saveOpenAiCompatApiKey(apiKey);
        dispatch({ type: "set-provider", provider: "openai_compat" });
        dispatch({ type: "set-selected-model", id: modelId });
      }
    } else {
      await neurodeckApi.store.setConfig("llm.default_provider", "offline-draft");
      dispatch({ type: "set-provider", provider: "offline-draft" });
      dispatch({ type: "set-selected-model", id: "NeuroDraft" });
    }
  };

  const savePreferences = async () => {
    await updateSettings({
      activeThemeId: themeId,
      fontScale,
      compactMode,
      accessibilityProfile: reducedMotion ? "reduced_motion" : "default",
    });
    dispatch({
      type: "set-theme",
      theme: (availableThemes.find((t) => t.id === themeId)?.name || "Blacksite") as ThemeName,
    });
    if (state.deckMode !== compactMode) dispatch({ type: "toggle-deck-mode" });
  };

  // ─── Dismiss / navigation ─────────────────────────────────────────────────

  const dismiss = async (status: "completed" | "skipped") => {
    const statePayload = {
      status,
      currentStep,
      completedSteps,
      skippedSteps: [],
      warnings: diagnosticsWarnings,
      errors: diagnosticsErrors,
      modelConfigured: providerType !== "skip",
      pluginsDetected: pluginStats.installed > 0,
      completedAt: new Date().toISOString(),
    };
    try {
      await neurodeckApi.store.set(ONBOARDING_STORE_KEY, statePayload);
      localStorage.setItem(LEGACY_COMPLETE_KEY, "true");
    } catch (_) {}
    dispatch({ type: "close-onboarding" });
  };

  const handleNext = async () => {
    if (currentStep === "models") await saveModels();
    else if (currentStep === "preferences") await savePreferences();
    wizardDispatch({ type: "complete-and-advance" });
  };

  const handleBack = () => wizardDispatch({ type: "back" });

  const handleStepClick = async (stepId: OnboardingStep) => {
    const currentIdx = STEPS.findIndex((s) => s.id === currentStep);
    const targetIdx = STEPS.findIndex((s) => s.id === stepId);
    if (targetIdx < currentIdx) {
      wizardDispatch({ type: "go-to", step: stepId });
      return;
    }
    if (currentStep === "environment" && diagnosticsErrors.length > 0 && targetIdx > currentIdx)
      return;
    if (currentStep === "models") await saveModels();
    else if (currentStep === "preferences") await savePreferences();
    wizardDispatch({ type: "go-to", step: stepId });
  };

  const isNextDisabled = () => {
    if (currentStep === "environment") return diagnosticsLoading || diagnosticsErrors.length > 0;
    if (currentStep === "models" && providerType === "openai_compat" && !apiKey) return true;
    return false;
  };

  // ─── Side effects ─────────────────────────────────────────────────────────

  useEffect(() => {
    void runPrecheck();
  }, [runPrecheck]);

  useEffect(() => {
    if (!neurodeckApi.dependency?.onProgress) return;
    type ProgEvent = {
      id: string;
      state: string;
      percent?: number;
      speed?: number;
      error?: string;
    };
    const unsub = neurodeckApi.dependency.onProgress((data: ProgEvent) => {
      setInstallerProgress((prev) => ({
        ...prev,
        [data.id]: {
          state: data.state,
          percent: data.percent,
          speed: data.speed,
          error: data.error,
        } as InstallerItemState,
      }));
      if (data.state === "completed") void runDiagnostics();
    });
    return unsub;
  }, [runDiagnostics]);

  useEffect(() => {
    if (currentStep === "environment") void runDiagnostics();
    else if (currentStep === "plugins") void loadPluginsCheck();
  }, [currentStep, runDiagnostics]);

  // Prefill default endpoint URLs when provider type changes
  useEffect(() => {
    if (providerType === "ollama") {
      setEndpointUrl("http://127.0.0.1:11434");
      setModelId("llama3");
    } else if (providerType === "lmstudio") {
      setEndpointUrl("http://127.0.0.1:1234/v1");
      setModelId("meta-llama-3-8b-instruct");
    } else if (providerType === "openai_compat") {
      setEndpointUrl("https://api.openai.com/v1");
      setModelId("gpt-4o-mini");
    }
    setTestResult(null);
  }, [providerType]);

  // Focus trap
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!wizardRef.current) return;
      if (e.key === "Escape") {
        if (precheckPassed && (currentStep === "welcome" || currentStep === "finish"))
          void dismiss("skipped");
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        wizardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)
      ).filter((el) => !el.closest('[aria-hidden="true"]') && el.tabIndex !== -1);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeydown, true);
    return () => document.removeEventListener("keydown", handleKeydown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, precheckPassed]);

  // Auto-focus first element on step change
  useEffect(() => {
    if (!wizardRef.current) return;
    const focusable = wizardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS);
    focusable[0]?.focus();
  }, [currentStep]);

  // ─── Controller bindings ──────────────────────────────────────────────────

  useControllerAction(
    "back",
    () => {
      if (currentStep === "welcome") {
        if (precheckPassed) void dismiss("skipped");
        return true;
      }
      handleBack();
      return true;
    },
    true
  );
  useControllerAction(
    "cancel",
    () => {
      if (currentStep === "welcome" || currentStep === "finish") {
        if (precheckPassed) void dismiss("skipped");
        return true;
      }
      handleBack();
      return true;
    },
    true
  );
  useControllerAction(
    "forward",
    () => {
      if (isNextDisabled()) return true;
      void handleNext();
      return true;
    },
    true
  );
  useControllerAction(
    "openSearch",
    () => {
      const target = wizardRef.current?.querySelector<HTMLElement>(
        "input:not(:disabled), select:not(:disabled), textarea:not(:disabled)"
      );
      target?.focus();
      target?.scrollIntoView({ block: "nearest" });
      return true;
    },
    true
  );

  // ─── Installer handlers ───────────────────────────────────────────────────

  const handleInstall = async (id: string) => {
    setInstallerProgress((prev) => ({ ...prev, [id]: { state: "downloading", percent: 0 } }));
    try {
      await neurodeckApi.dependency.install(id);
      void runDiagnostics();
    } catch (e: unknown) {
      setInstallerProgress((prev) => ({
        ...prev,
        [id]: { state: "failed", error: (e as Error).message || String(e) },
      }));
    }
  };

  const handleCancelInstall = async (id: string) => {
    try {
      await neurodeckApi.dependency.cancel(id);
      setInstallerProgress((prev) => ({ ...prev, [id]: { state: "idle" } }));
    } catch (_) {}
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      id="onboarding-overlay"
      data-controller-overlay="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md"
    >
      <div
        ref={wizardRef}
        data-controller-zone="modal"
        className="no-drag flex h-[600px] w-full max-w-4xl flex-row overflow-hidden rounded-[var(--nd-radius-xl)] border border-[var(--nd-border-default)] bg-[var(--nd-surface-modal)] shadow-[var(--nd-elevation-overlay)]"
        role="dialog"
        aria-modal="true"
        aria-label="NEURODECK Setup Wizard"
      >
        {/* Sidebar — step progress */}
        <aside className="flex w-56 shrink-0 select-none flex-col justify-between border-r border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)] p-5">
          <div className="space-y-5">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-tertiary)] shadow-[var(--nd-elevation-panel)]">
                <Rocket className="h-4 w-4 text-[var(--nd-accent-primary)]" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-[11px] font-bold uppercase tracking-[var(--nd-tracking-hud)] text-[var(--nd-accent-primary)]">
                  NEURODECK
                </h1>
                <p className="text-[11px] text-[var(--nd-text-muted)]">Setup Control</p>
              </div>
            </div>

            <nav className="space-y-1.5" aria-label="Setup steps">
              {STEPS.map((s, idx) => {
                const isCurrent = s.id === currentStep;
                const isDone = completedSteps.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => void handleStepClick(s.id)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`nd-focus-ring flex w-full items-center gap-3 rounded-[var(--nd-radius-md)] border px-3 py-2.5 text-left transition motion-reduce:transition-none ${
                      isCurrent
                        ? "border-[rgba(var(--nd-cyan-rgb),0.3)] bg-[var(--nd-accent-soft)] text-[var(--nd-accent-primary)]"
                        : isDone
                          ? "border-transparent text-[var(--nd-accent-success)] hover:bg-[var(--nd-surface-hover)]"
                          : "border-transparent text-[var(--nd-text-muted)] hover:bg-[var(--nd-surface-hover)] hover:text-[var(--nd-text-primary)]"
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                      {isDone ? (
                        <Check
                          className="h-4 w-4 text-[var(--nd-accent-success)]"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="font-mono">{idx + 1}</span>
                      )}
                    </span>
                    <span className={`text-xs ${isCurrent ? "font-semibold" : ""} truncate`}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-[var(--nd-border-subtle)] px-2 pt-3">
            <p className="text-[11px] text-[var(--nd-text-muted)]">Version: {appVersion}</p>
            <p className="mt-0.5 text-[11px] text-[var(--nd-text-muted)]">
              {isSteamDeck ? "Steam Deck Mode" : "Desktop Mode"}
            </p>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--nd-surface-app)]">
          <div className="flex-1 overflow-y-auto px-8 py-7 scrollbar-thin">
            {currentStep === "welcome" && (
              <StepWelcome
                appVersion={appVersion}
                isSteamDeck={isSteamDeck}
                precheckPassed={precheckPassed}
                prechecking={prechecking}
              />
            )}
            {currentStep === "environment" && (
              <StepEnvironment
                diagnosticResult={diagnosticResult}
                diagnosticsLoading={diagnosticsLoading}
                ollamaInstalled={ollamaInstalled}
                openvpnInstalled={openvpnInstalled}
                wireguardInstalled={wireguardInstalled}
                installerProgress={installerProgress}
                onRescan={runDiagnostics}
                onInstall={handleInstall}
                onCancelInstall={handleCancelInstall}
              />
            )}
            {currentStep === "models" && (
              <StepModels
                providerType={providerType}
                endpointUrl={endpointUrl}
                modelId={modelId}
                apiKey={apiKey}
                showApiKey={showApiKey}
                testingConnection={testingConnection}
                testResult={testResult}
                onProviderChange={setProviderType}
                onEndpointChange={setEndpointUrl}
                onModelIdChange={setModelId}
                onApiKeyChange={setApiKey}
                onToggleShowApiKey={() => setShowApiKey((v) => !v)}
                onTestConnection={testModelConnection}
              />
            )}
            {currentStep === "npm" && <StepNpmInstaller />}
            {currentStep === "preferences" && (
              <StepPreferences
                availableThemes={availableThemes}
                themeId={themeId}
                fontScale={fontScale}
                compactMode={compactMode}
                reducedMotion={reducedMotion}
                onThemeChange={setThemeId}
                onFontScaleChange={setFontScale}
                onCompactModeToggle={() => setCompactMode((v) => !v)}
                onReducedMotionToggle={() => setReducedMotion((v) => !v)}
              />
            )}
            {currentStep === "plugins" && (
              <StepPlugins pluginStats={pluginStats} pluginsLoading={pluginsLoading} />
            )}
            {currentStep === "packages" && (
              <StepPackages
                onInstallComplete={() => {
                  wizardDispatch({ type: "complete-and-advance" });
                }}
              />
            )}
            {currentStep === "finish" && (
              <StepFinish
                availableThemes={availableThemes}
                themeId={themeId}
                fontScale={fontScale}
                providerType={providerType}
                diagnosticsErrors={diagnosticsErrors}
                diagnosticsWarnings={diagnosticsWarnings}
              />
            )}
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-between border-t border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)] px-8 py-4">
            <div className="flex gap-2">
              {currentStep !== "welcome" && (
                <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={handleBack}>
                  Back
                </Button>
              )}
              {(currentStep === "welcome" ||
                currentStep === "environment" ||
                currentStep === "npm" ||
                currentStep === "packages") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (currentStep === "npm" || currentStep === "packages") {
                      void handleNext();
                    } else {
                      void dismiss("skipped");
                    }
                  }}
                >
                  {currentStep === "npm"
                    ? "Skip NPM"
                    : currentStep === "packages"
                      ? "Skip Packages"
                      : "Skip for Now"}
                </Button>
              )}
            </div>

            <div>
              {currentStep === "finish" ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Check}
                  onClick={() => void dismiss("completed")}
                >
                  Enter Workspace
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  icon={ArrowRight}
                  iconPosition="right"
                  disabled={isNextDisabled()}
                  onClick={() => void handleNext()}
                >
                  Next
                </Button>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
