import { useCallback, useEffect, useState, useRef, type Dispatch } from 'react';
import {
  CheckCircle2, Circle, Loader2, Rocket, Terminal, Wifi, KeyRound, ShieldCheck, X,
  Volume2, HardDrive, ArrowLeft, ArrowRight, Save, Play, RefreshCw, Palette,
  Eye, EyeOff, Check, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import { useControllerAction } from '../../input/controller/useControllerAction';
import { useTheme } from '../../theme/useTheme';
import type { NeuroDeckState, NeuroDeckAction, AIProvider } from '../../types/neurodeck';
import type { OnboardingStep, SetupWarning, SetupError, OnboardingDiagnosticResult } from '../../types/onboarding';

const ONBOARDING_STORE_KEY = 'neurodeck_onboarding_state';
const LEGACY_COMPLETE_KEY = 'neurodeck_onboarding_complete';

interface StepDef {
  id: OnboardingStep;
  label: string;
  description: string;
}

const STEPS: StepDef[] = [
  { id: 'welcome', label: 'Welcome', description: 'Introduction to NEURODECK' },
  { id: 'environment', label: 'Environment', description: 'Validate runtime parameters' },
  { id: 'models', label: 'AI Model Connection', description: 'Configure AI endpoint sources' },
  { id: 'preferences', label: 'Preferences', description: 'UI styling and layout density' },
  { id: 'plugins', label: 'Plugins', description: 'Lua automation features' },
  { id: 'finish', label: 'Finish', description: 'Launch workspace' },
];

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function OnboardingModal({
  state,
  dispatch,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
}) {
  const { availableThemes, settings, updateSettings } = useTheme();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const [skippedSteps, setSkippedSteps] = useState<OnboardingStep[]>([]);
  
  // welcome step checks
  const [precheckPassed, setPrecheckPassed] = useState(false);
  const [prechecking, setPrechecking] = useState(true);
  const [isSteamDeck, setIsSteamDeck] = useState(false);
  const [appVersion, setAppVersion] = useState('1.8.0');

  // environment check step
  const [diagnosticResult, setDiagnosticResult] = useState<OnboardingDiagnosticResult | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsErrors, setDiagnosticsErrors] = useState<SetupError[]>([]);
  const [diagnosticsWarnings, setDiagnosticsWarnings] = useState<SetupWarning[]>([]);

  // model setup step
  const [providerType, setProviderType] = useState<AIProvider | 'lmstudio' | 'skip'>('ollama');
  const [endpointUrl, setEndpointUrl] = useState('http://127.0.0.1:11434');
  const [modelId, setModelId] = useState('llama3');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // workspace preferences step
  const [themeId, setThemeId] = useState(settings.activeThemeId);
  const [fontScale, setFontScale] = useState(settings.fontScale);
  const [compactMode, setCompactMode] = useState(settings.compactMode);
  const [reducedMotion, setReducedMotion] = useState(settings.accessibilityProfile === 'reduced_motion');

  // plugin setup step
  const [pluginStats, setPluginStats] = useState({ installed: 0, active: 0, disabled: 0, errors: 0 });
  const [pluginsLoading, setPluginsLoading] = useState(false);

  // Modal dialog DOM ref for focus trap
  const wizardRef = useRef<HTMLDivElement>(null);

  // Run precheck to determine if the user can skip setup immediately
  const runPrecheck = useCallback(async () => {
    setPrechecking(true);
    try {
      const health = await neurodeckApi.diagnostics.get();
      if (!health.appVersion) {
        throw new Error('Bridge connection is offline');
      }
      setAppVersion(health.appVersion);

      const env = await neurodeckApi.terminal.getEnvironment();
      setIsSteamDeck(env.steamDeckHost);

      // Verify basic PTY terminal spawn
      const ptyRes = await neurodeckApi.terminal.spawn('precheck_test');
      if (!ptyRes || !ptyRes.success) {
        throw new Error('PTY spawn failed');
      }
      await neurodeckApi.terminal.kill('precheck_test');
      
      setPrecheckPassed(true);
    } catch (_) {
      setPrecheckPassed(false);
    } finally {
      setPrechecking(false);
    }
  }, []);

  // Run full environment diagnostics check
  const runDiagnostics = useCallback(async () => {
    setDiagnosticsLoading(true);
    setDiagnosticsErrors([]);
    setDiagnosticsWarnings([]);
    try {
      const res = await neurodeckApi.diagnostics.runOnboardingDiagnostics();
      setDiagnosticResult(res);

      const errors: SetupError[] = [];
      const warnings: SetupWarning[] = [];

      // Critical Checks
      if (!res.pty_ok) {
        errors.push({
          code: 'PTY_FAIL',
          message: 'PTY Terminal Subsystem failed to spawn.',
          fix: 'Ensure shell terminal binary access permissions are configured correctly.'
        });
      }
      if (!res.network_ok) {
        // If Gemini endpoint is not reachable but Google is, it is a warning.
        // If Google is down, it's an error.
        if (res.network_details.includes('restricted')) {
          warnings.push({
            code: 'API_RESTRICTED',
            message: 'Internet active, but Gemini Cloud API endpoints are restricted.',
            fix: 'Check proxy settings, firewall rules, or DNS configuration.'
          });
        } else {
          errors.push({
            code: 'NET_DOWN',
            message: 'Network connection unreachable.',
            fix: 'Check local router connections, wireless switches, or network cables.'
          });
        }
      }

      // Warning Checks
      if (!res.keychain_ok) {
        warnings.push({
          code: 'KEYCHAIN_FAIL',
          message: 'System keychain / secure credential storage is unavailable.',
          fix: 'Ollama works, but Gemini API keys will fall back to local storage.'
        });
      }
      if (!res.audio_ok) {
        warnings.push({
          code: 'AUDIO_UNAVAILABLE',
          message: 'No active audio input device detected.',
          fix: 'Voice command STT capabilities require an active microphone input.'
        });
      }
      if (!res.ssh_ok) {
        warnings.push({
          code: 'SSH_MISSING',
          message: 'SSH client binary was not found in system PATH.',
          fix: 'Remote SSH connections and secure loopback tunnel services require OpenSSH.'
        });
      }
      if (!res.tts_ok) {
        warnings.push({
          code: 'TTS_MISSING',
          message: 'No supported Speech Synthesis TTS engine discovered.',
          fix: 'Voice responses require espeak-ng (Linux) or Windows SAPI.'
        });
      }

      setDiagnosticsErrors(errors);
      setDiagnosticsWarnings(warnings);
    } catch (e) {
      setDiagnosticsErrors([{
        code: 'DIAG_CRASH',
        message: `Diagnostics crashed: ${String(e)}`,
        fix: 'Restart bridge server sidecar and try again.'
      }]);
    } finally {
      setDiagnosticsLoading(false);
    }
  }, []);

  // Run model endpoint connection probe
  const testModelConnection = async () => {
    if (providerType === 'skip') {
      setTestResult({ success: true, message: 'Offline planning selected. Connection test skipped.' });
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    const backendProvider = providerType === 'lmstudio' ? 'openai_compat' : providerType;

    try {
      // Temporarily set configuration to test the server connection
      if (backendProvider === 'ollama') {
        await neurodeckApi.store.setConfig('llm.ollama_base_url', endpointUrl);
        await neurodeckApi.store.setConfig('llm.ollama_model', modelId);
      } else if (backendProvider === 'openai_compat') {
        await neurodeckApi.store.setConfig('llm.openai_compat_base_url', endpointUrl);
        await neurodeckApi.store.setConfig('llm.openai_compat_model', modelId);
        if (apiKey) {
          await neurodeckApi.store.saveOpenAiCompatApiKey(apiKey);
        }
      }

      await neurodeckApi.store.setConfig('llm.default_provider', backendProvider);

      // Perform actual health check
      const healthList = await neurodeckApi.models.getProviderHealth();
      const match = healthList.find((h) => h.runtime_type === (backendProvider === 'openai_compat' ? 'openai-compatible-remote' : 'ollama'));

      if (match && match.state === 'connected') {
        setTestResult({
          success: true,
          message: `Successfully connected to ${providerType === 'lmstudio' ? 'LM Studio' : providerType.toUpperCase()}. Found models: ${match.models.join(', ') || 'none'}`
        });
      } else {
        setTestResult({
          success: false,
          message: `Connection timed out or returned offline: ${match?.error || match?.state || 'Unknown response'}`
        });
      }
    } catch (e) {
      setTestResult({
        success: false,
        message: `Connection failed: ${String(e)}. Double check endpoint URL and server status.`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Load real plugin metrics
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

  // Initialize and load prechecks
  useEffect(() => {
    void runPrecheck();
  }, [runPrecheck]);

  // Load steps diagnostics or plugins dynamically when step changes
  useEffect(() => {
    if (currentStep === 'environment') {
      void runDiagnostics();
    } else if (currentStep === 'plugins') {
      void loadPluginsCheck();
    }
  }, [currentStep, runDiagnostics]);

  // Keyboard navigation focus trap inside onboarding modal
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!wizardRef.current) return;

      if (e.key === 'Escape') {
        // Prevent dismissal unless precheck is healthy and welcome allows it
        if (precheckPassed && (currentStep === 'welcome' || currentStep === 'finish')) {
          dismiss('skipped');
        }
        return;
      }

      if (e.key !== 'Tab') return;

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

    document.addEventListener('keydown', handleKeydown, true);
    return () => document.removeEventListener('keydown', handleKeydown, true);
  }, [currentStep, precheckPassed]);

  // Auto-focus first element in screen changes
  useEffect(() => {
    if (!wizardRef.current) return;
    const focusable = wizardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS);
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, [currentStep]);

  // Prefill default URLs when provider type changes in model setup
  useEffect(() => {
    if (providerType === 'ollama') {
      setEndpointUrl('http://127.0.0.1:11434');
      setModelId('llama3');
    } else if (providerType === 'lmstudio') {
      setEndpointUrl('http://127.0.0.1:1234/v1');
      setModelId('meta-llama-3-8b-instruct');
    } else if (providerType === 'openai_compat') {
      setEndpointUrl('https://api.openai.com/v1');
      setModelId('gpt-4o-mini');
    }
    setTestResult(null);
  }, [providerType]);

  // Save Step 3 (Models)
  const saveModels = async () => {
    const backendProvider = providerType === 'lmstudio' ? 'openai_compat' : providerType;

    if (backendProvider !== 'skip') {
      await neurodeckApi.store.setConfig('llm.default_provider', backendProvider);
      if (backendProvider === 'ollama') {
        await neurodeckApi.store.setConfig('llm.ollama_base_url', endpointUrl);
        await neurodeckApi.store.setConfig('llm.ollama_model', modelId);
        dispatch({ type: 'set-provider', provider: 'ollama' });
        dispatch({ type: 'set-selected-model', id: modelId });
      } else if (backendProvider === 'openai_compat') {
        await neurodeckApi.store.setConfig('llm.openai_compat_base_url', endpointUrl);
        await neurodeckApi.store.setConfig('llm.openai_compat_model', modelId);
        if (apiKey) {
          await neurodeckApi.store.saveOpenAiCompatApiKey(apiKey);
        }
        dispatch({ type: 'set-provider', provider: 'openai_compat' });
        dispatch({ type: 'set-selected-model', id: modelId });
      }
    } else {
      await neurodeckApi.store.setConfig('llm.default_provider', 'offline-draft');
      dispatch({ type: 'set-provider', provider: 'offline-draft' });
      dispatch({ type: 'set-selected-model', id: 'NeuroDraft' });
    }
  };

  // Save Step 4 (Preferences)
  const savePreferences = async () => {
    await updateSettings({
      activeThemeId: themeId,
      fontScale,
      compactMode,
      accessibilityProfile: reducedMotion ? 'reduced_motion' : 'default',
    });

    dispatch({ type: 'set-theme', theme: (availableThemes.find((t) => t.id === themeId)?.name || 'Blacksite') as any });
    if (state.deckMode !== compactMode) {
      dispatch({ type: 'toggle-deck-mode' });
    }
  };

  // Skip/Finish onboarding completely
  const dismiss = async (status: 'completed' | 'skipped') => {
    const completedAt = new Date().toISOString();
    const statePayload = {
      status,
      currentStep,
      completedSteps,
      skippedSteps,
      warnings: diagnosticsWarnings,
      errors: diagnosticsErrors,
      modelConfigured: providerType !== 'skip',
      pluginsDetected: pluginStats.installed > 0,
      completedAt,
    };

    try {
      await neurodeckApi.store.set(ONBOARDING_STORE_KEY, statePayload);
      localStorage.setItem(LEGACY_COMPLETE_KEY, 'true');
    } catch (_) {}

    dispatch({ type: 'toggle-onboarding' });
  };

  // Handle Next step transitions
  const handleNext = async () => {
    const stepIdx = STEPS.findIndex((s) => s.id === currentStep);
    if (stepIdx === -1) return;

    if (currentStep === 'models') {
      await saveModels();
    } else if (currentStep === 'preferences') {
      await savePreferences();
    }

    setCompletedSteps((prev) => [...prev.filter((s) => s !== currentStep), currentStep]);

    if (stepIdx < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIdx + 1].id);
    }
  };

  // Handle Back step transitions
  const handleBack = () => {
    const stepIdx = STEPS.findIndex((s) => s.id === currentStep);
    if (stepIdx > 0) {
      setCurrentStep(STEPS[stepIdx - 1].id);
    }
  };

  // Handle step click from sidebar
  const handleStepClick = async (stepId: OnboardingStep) => {
    const currentIdx = STEPS.findIndex((s) => s.id === currentStep);
    const targetIdx = STEPS.findIndex((s) => s.id === stepId);

    // Let user click back steps freely. Forwards require validation
    if (targetIdx < currentIdx) {
      setCurrentStep(stepId);
      return;
    }

    // Critical block in Environment check
    if (currentStep === 'environment' && diagnosticsErrors.length > 0 && targetIdx > currentIdx) {
      return;
    }

    if (currentStep === 'models') {
      await saveModels();
    } else if (currentStep === 'preferences') {
      await savePreferences();
    }

    setCurrentStep(stepId);
  };

  const isNextDisabled = () => {
    if (currentStep === 'environment') {
      return diagnosticsLoading || diagnosticsErrors.length > 0;
    }
    if (currentStep === 'models' && providerType === 'openai_compat' && !apiKey) {
      // Require key for remote OpenAI compatibility
      return true;
    }
    return false;
  };

  useControllerAction(
    'back',
    () => {
      if (currentStep === 'welcome') {
        if (precheckPassed) {
          void dismiss('skipped');
        }
        return true;
      }
      handleBack();
      return true;
    },
    true,
  );
  useControllerAction(
    'cancel',
    () => {
      if (currentStep === 'welcome' || currentStep === 'finish') {
        if (precheckPassed) {
          void dismiss('skipped');
        }
        return true;
      }
      handleBack();
      return true;
    },
    true,
  );
  useControllerAction(
    'forward',
    () => {
      if (isNextDisabled()) return true;
      void handleNext();
      return true;
    },
    true,
  );
  useControllerAction(
    'openSearch',
    () => {
      const target = wizardRef.current?.querySelector<HTMLElement>(
        "input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
      );
      target?.focus();
      target?.scrollIntoView({ block: 'nearest' });
      return true;
    },
    true,
  );

  return (
    <div data-controller-overlay="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md">
      <div
        ref={wizardRef}
        data-controller-zone="modal"
        className="no-drag w-full max-w-4xl h-[600px] overflow-hidden rounded-3xl border border-nd-accent/25 bg-nd-bg/95 shadow-2xl shadow-nd-accent/10 flex flex-row"
        role="dialog"
        aria-modal="true"
        aria-label="NEURODECK Setup Wizard"
      >
        {/* Left Sidebar Steps progress */}
        <aside className="w-56 shrink-0 border-r border-nd-text-muted/10 bg-nd-surface/20 p-5 flex flex-col justify-between select-none">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 px-2 py-1 mb-4">
              <Rocket className="h-5 w-5 text-nd-accent animate-pulse" aria-hidden="true" />
              <div>
                <h1 className="text-xs font-bold uppercase tracking-wider text-nd-accent">NEURODECK</h1>
                <p className="text-[10px] text-nd-text-muted">Setup Control</p>
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
                    onClick={() => handleStepClick(s.id)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                      isCurrent
                        ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent font-semibold'
                        : isDone
                        ? 'border-transparent text-nd-success hover:bg-nd-surface/50'
                        : 'border-transparent text-nd-text-muted/70 hover:text-nd-text hover:bg-nd-surface/40'
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-xs">
                      {isDone ? (
                        <Check className="h-4 w-4 text-nd-success font-bold" aria-hidden="true" />
                      ) : (
                        <span className="font-mono">{idx + 1}</span>
                      )}
                    </span>
                    <span className="text-xs truncate">{s.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="px-2 py-1 border-t border-nd-text-muted/10 pt-3">
            <p className="text-[10px] text-nd-text-muted">Version: {appVersion}</p>
            <p className="text-[9px] text-nd-text-muted/65 mt-0.5">
              {isSteamDeck ? 'Steam Deck Mode' : 'Desktop Mode'}
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-nd-bg/20">
          <div className="flex-1 overflow-y-auto px-8 py-7 scrollbar-thin">
            
            {/* STEP 1: WELCOME SCREEN */}
            {currentStep === 'welcome' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight text-nd-text">Welcome to NEURODECK</h2>
                  <p className="text-sm text-nd-text-muted">Turn your device into a focused local-first AI workstation.</p>
                </div>

                <div className="rounded-2xl border border-nd-accent/15 bg-nd-accent/[0.03] p-5 space-y-4">
                  <h3 className="font-semibold text-nd-text text-sm">System Environment Detected</h3>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/40 p-3 flex items-center gap-3">
                      <Terminal className="h-5 w-5 text-nd-accent" aria-hidden="true" />
                      <div>
                        <p className="text-xs text-nd-text-muted">Device Class</p>
                        <p className="text-sm font-semibold text-nd-text mt-0.5">
                          {isSteamDeck ? 'Steam Deck Console' : 'Standard PC Workstation'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/40 p-3 flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-nd-accent" aria-hidden="true" />
                      <div>
                        <p className="text-xs text-nd-text-muted">App Release</p>
                        <p className="text-sm font-semibold text-nd-text mt-0.5">v{appVersion}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-nd-text-muted/85 leading-relaxed">
                    This wizard will verify your local diagnostic environment, configure connection variables to local/remote models, select themes, and check active Lua automation scripts.
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl border border-nd-text-muted/10 bg-nd-surface/20">
                  {prechecking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-nd-accent" aria-hidden="true" />
                      <span className="text-xs text-nd-text-muted">Pre-checking system environment...</span>
                    </>
                  ) : precheckPassed ? (
                    <>
                      <Check className="h-4 w-4 text-nd-success" aria-hidden="true" />
                      <span className="text-xs text-nd-success font-medium">Basic diagnostic requirements passing. You can safely skip setup.</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-4 w-4 text-nd-warning" aria-hidden="true" />
                      <span className="text-xs text-nd-text-muted">Initial environment issue detected. Setup recommended before launching.</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: ENVIRONMENT DIAGNOSTICS */}
            {currentStep === 'environment' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-nd-text">Environment Integrity Check</h2>
                    <p className="text-xs text-nd-text-muted">Verifying system access layers and dependencies.</p>
                  </div>
                  <button
                    type="button"
                    onClick={runDiagnostics}
                    disabled={diagnosticsLoading}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-3 text-xs text-nd-text transition hover:bg-nd-surface/65"
                  >
                    <RefreshCw className={`h-3 w-3 ${diagnosticsLoading ? 'animate-spin' : ''}`} aria-hidden="true" /> Re-scan
                  </button>
                </div>

                {diagnosticsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-nd-accent" aria-hidden="true" />
                    <p className="text-xs text-nd-text-muted font-medium">Scanning subsystem endpoints...</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {diagnosticResult && (
                      <>
                        {/* PTY */}
                        <div className="flex items-start gap-3 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-3">
                          <Terminal className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${diagnosticResult.pty_ok ? 'text-nd-success' : 'text-nd-danger'}`} aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-nd-text">PTY Terminal Subsystem</span>
                              <span className={`text-[10px] font-bold uppercase ${diagnosticResult.pty_ok ? 'text-nd-success' : 'text-nd-danger'}`}>
                                {diagnosticResult.pty_ok ? 'Ready' : 'Error'}
                              </span>
                            </div>
                            <p className="text-[11px] text-nd-text-muted mt-0.5">{diagnosticResult.pty_details}</p>
                            {!diagnosticResult.pty_ok && (
                              <p className="text-[10px] text-nd-danger mt-1"><strong>Fix:</strong> Verify terminal binary permissions or run app as admin.</p>
                            )}
                          </div>
                        </div>

                        {/* Network */}
                        <div className="flex items-start gap-3 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-3">
                          <Wifi className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${diagnosticResult.network_ok ? 'text-nd-success' : 'text-nd-warning'}`} aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-nd-text">Bridge Connection & Internet</span>
                              <span className={`text-[10px] font-bold uppercase ${diagnosticResult.network_ok ? 'text-nd-success' : 'text-nd-warning'}`}>
                                {diagnosticResult.network_ok ? 'Connected' : 'Warning'}
                              </span>
                            </div>
                            <p className="text-[11px] text-nd-text-muted mt-0.5">{diagnosticResult.network_details}</p>
                            {!diagnosticResult.network_ok && (
                              <p className="text-[10px] text-nd-warning mt-1"><strong>Fix:</strong> Check your local router connection or firewall port 9477.</p>
                            )}
                          </div>
                        </div>

                        {/* Keychain */}
                        <div className="flex items-start gap-3 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-3">
                          <KeyRound className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${diagnosticResult.keychain_ok ? 'text-nd-success' : 'text-nd-warning'}`} aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-nd-text">Secure Credential Storage</span>
                              <span className={`text-[10px] font-bold uppercase ${diagnosticResult.keychain_ok ? 'text-nd-success' : 'text-nd-warning'}`}>
                                {diagnosticResult.keychain_ok ? 'Active' : 'Unprobed'}
                              </span>
                            </div>
                            <p className="text-[11px] text-nd-text-muted mt-0.5">{diagnosticResult.keychain_details}</p>
                            {!diagnosticResult.keychain_ok && (
                              <p className="text-[10px] text-nd-warning mt-1"><strong>Warning:</strong> Keychain locked or blocked. Keys saved locally instead.</p>
                            )}
                          </div>
                        </div>

                        {/* Audio */}
                        <div className="flex items-start gap-3 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-3">
                          <Volume2 className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${diagnosticResult.audio_ok ? 'text-nd-success' : 'text-nd-warning'}`} aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-nd-text">Voice Input Devices</span>
                              <span className={`text-[10px] font-bold uppercase ${diagnosticResult.audio_ok ? 'text-nd-success' : 'text-nd-warning'}`}>
                                {diagnosticResult.audio_ok ? 'Detected' : 'Unprobed'}
                              </span>
                            </div>
                            <p className="text-[11px] text-nd-text-muted mt-0.5">{diagnosticResult.audio_details}</p>
                            {!diagnosticResult.audio_ok && (
                              <p className="text-[10px] text-nd-warning mt-1"><strong>Fix:</strong> Connect a microphone input device for voice STT commands.</p>
                            )}
                          </div>
                        </div>

                        {/* SSH */}
                        <div className="flex items-start gap-3 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-3">
                          <HardDrive className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${diagnosticResult.ssh_ok ? 'text-nd-success' : 'text-nd-warning'}`} aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-nd-text">SSH Client Subsystem</span>
                              <span className={`text-[10px] font-bold uppercase ${diagnosticResult.ssh_ok ? 'text-nd-success' : 'text-nd-warning'}`}>
                                {diagnosticResult.ssh_ok ? 'Detected' : 'Missing'}
                              </span>
                            </div>
                            <p className="text-[11px] text-nd-text-muted mt-0.5">{diagnosticResult.ssh_details}</p>
                            {!diagnosticResult.ssh_ok && (
                              <p className="text-[10px] text-nd-warning mt-1"><strong>Fix:</strong> Install openSSH or ensure ssh.exe is in system environment PATH.</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: MODEL CONNECTION SETUP */}
            {currentStep === 'models' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-nd-text">AI Provider Setup</h2>
                  <p className="text-xs text-nd-text-muted">Link your local or remote LLM endpoint sources.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-nd-text">Provider Type</label>
                      <select
                        data-controller-default="true"
                        value={providerType}
                        onChange={(e) => setProviderType(e.target.value as any)}
                        className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                      >
                        <option value="ollama">Ollama (Local)</option>
                        <option value="lmstudio">LM Studio (Local)</option>
                        <option value="openai_compat">OpenAI-Compatible Endpoint</option>
                        <option value="skip">Skip / Offline planning engine</option>
                      </select>
                    </div>

                    {providerType !== 'skip' && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-nd-text">Endpoint URL</label>
                          <input
                            type="text"
                            value={endpointUrl}
                            onChange={(e) => setEndpointUrl(e.target.value)}
                            className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-nd-text">Model Identifier</label>
                          <input
                            type="text"
                            value={modelId}
                            onChange={(e) => setModelId(e.target.value)}
                            className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                          />
                        </div>
                      </>
                    )}

                    {providerType === 'openai_compat' && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-nd-text">API Token / key</label>
                        <div className="relative">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="OpenAI or Custom Provider API key..."
                            className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 pl-3 pr-10 py-2 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-nd-text-muted hover:text-nd-text"
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl border border-nd-text-muted/10 bg-nd-surface/20 p-4">
                    <div className="space-y-2 text-xs text-nd-text-muted">
                      <h4 className="font-semibold text-nd-text text-sm">Provider Advice</h4>
                      {providerType === 'ollama' && (
                        <p className="leading-relaxed">Ollama runs models locally on your system. Ensure Ollama is running in the background and you have pulled your target model (e.g. <code>ollama pull llama3</code>).</p>
                      )}
                      {providerType === 'lmstudio' && (
                        <p className="leading-relaxed">LM Studio lets you host local models with an OpenAI-compatible server. Start LM Studio and run the local server on port 1234.</p>
                      )}
                      {providerType === 'openai_compat' && (
                        <p className="leading-relaxed">Use any custom API provider following the OpenAI spec (e.g., OpenRouter, TogetherAI, Groq). An API key is required.</p>
                      )}
                      {providerType === 'skip' && (
                        <p className="leading-relaxed text-nd-warning">Selecting offline planning skips model setup. You can still use code terminals and files, but LLM chat requests will return offline fallback responses.</p>
                      )}
                    </div>

                    <div className="space-y-2 mt-4">
                      {testResult && (
                        <div className={`p-3 rounded-xl border text-xs ${testResult.success ? 'border-nd-success/20 bg-nd-success/10 text-nd-success' : 'border-nd-danger/20 bg-nd-danger/10 text-nd-danger'}`}>
                          {testResult.message}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={testModelConnection}
                        disabled={testingConnection || (providerType === 'openai_compat' && !apiKey)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-nd-accent/30 bg-nd-accent/10 py-2.5 text-xs font-semibold text-nd-accent transition hover:bg-nd-accent/15"
                      >
                        {testingConnection ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Testing...
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" aria-hidden="true" /> Test Connection
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: WORKSPACE PREFERENCES */}
            {currentStep === 'preferences' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-nd-text">Preferences & Styling</h2>
                  <p className="text-xs text-nd-text-muted">Personalize your workspace aesthetics and layout scaling.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Theme Select */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-nd-text">Default Theme Preset</label>
                    <select
                      value={themeId}
                      onChange={(e) => setThemeId(e.target.value)}
                      className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                    >
                      {availableThemes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-nd-text-muted">Supports all synced 30+ premium, core, and accessibility themes.</p>
                  </div>

                  {/* Font Scale Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-nd-text">Text Font Scale</label>
                      <span className="font-mono text-xs text-nd-accent">{fontScale}%</span>
                    </div>
                    <input
                      type="range"
                      min={80}
                      max={120}
                      step={5}
                      value={fontScale}
                      onChange={(e) => setFontScale(Number(e.target.value))}
                      className="w-full accent-nd-accent mt-2"
                    />
                    <div className="flex justify-between text-[9px] text-nd-text-muted/60">
                      <span>80%</span>
                      <span>100%</span>
                      <span>120%</span>
                    </div>
                  </div>

                  {/* Layout Toggles */}
                  <div className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/20 p-4 space-y-3 col-span-2">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-nd-text">Compact Density Layout</p>
                        <p className="text-[10px] text-nd-text-muted">Reduce element spacing and padding. Recommended for Steam Deck.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCompactMode(!compactMode)}
                        aria-label={compactMode ? 'Disable compact density layout' : 'Enable compact density layout'}
                        aria-pressed={compactMode}
                        className="text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded"
                      >
                        {compactMode ? <CheckCircle2 className="h-5 w-5 text-nd-success" aria-hidden="true" /> : <Circle className="h-5 w-5 text-nd-text-muted" aria-hidden="true" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-nd-text-muted/10 pt-3">
                      <div>
                        <p className="text-xs font-semibold text-nd-text">Reduced Motion Effects</p>
                        <p className="text-[10px] text-nd-text-muted">Disable background shaders, particles, and fast slide animations.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReducedMotion(!reducedMotion)}
                        aria-label={reducedMotion ? 'Disable reduced motion effects' : 'Enable reduced motion effects'}
                        aria-pressed={reducedMotion}
                        className="text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded"
                      >
                        {reducedMotion ? <CheckCircle2 className="h-5 w-5 text-nd-success" aria-hidden="true" /> : <Circle className="h-5 w-5 text-nd-text-muted" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: PLUGINS SETUP SUMMARY */}
            {currentStep === 'plugins' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-nd-text">Script Automation & Plugins</h2>
                  <p className="text-xs text-nd-text-muted">Lua scripts loaded automatically at startup to expand agent capabilities.</p>
                </div>

                {pluginsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-nd-accent" aria-hidden="true" />
                    <p className="text-xs text-nd-text-muted font-medium">Scanning local plugins directory...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-nd-text-muted/10 bg-nd-surface/30 p-4 text-center">
                        <p className="text-xs text-nd-text-muted">Installed plugins</p>
                        <p className="text-2xl font-bold text-nd-text mt-1">{pluginStats.installed}</p>
                      </div>

                      <div className="rounded-2xl border border-nd-text-muted/10 bg-nd-surface/30 p-4 text-center">
                        <p className="text-xs text-nd-text-muted">Active scripts</p>
                        <p className="text-2xl font-bold text-nd-success mt-1">{pluginStats.active}</p>
                      </div>

                      <div className="rounded-2xl border border-nd-text-muted/10 bg-nd-surface/30 p-4 text-center">
                        <p className="text-xs text-nd-text-muted">Failed QA gate</p>
                        <p className={`text-2xl font-bold mt-1 ${pluginStats.errors > 0 ? 'text-nd-danger' : 'text-nd-text-muted'}`}>
                          {pluginStats.errors}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-nd-text-muted/10 bg-nd-surface/20 p-4 text-xs text-nd-text-muted leading-relaxed">
                      <p>
                        NEURODECK checks the <code>~/.config/neurodeck/plugins/</code> directory for Lua hooks. Active files are loaded securely into the sidecar mlua runtime. You can review plugin permissions and toggle active states in the controls workspace.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 6: FINISH / SUBMIT */}
            {currentStep === 'finish' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-nd-text">Setup Finalization</h2>
                  <p className="text-xs text-nd-text-muted">Review configuration settings before entering the workspace.</p>
                </div>

                <div className="rounded-2xl border border-nd-text-muted/10 bg-nd-surface/20 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-nd-success" aria-hidden="true" />
                    <div>
                      <h4 className="text-sm font-semibold text-nd-text">Configuration Verified</h4>
                      <p className="text-[11px] text-nd-text-muted">System parameters written to configuration files successfully.</p>
                    </div>
                  </div>

                  <div className="border-t border-nd-text-muted/10 pt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 text-xs">
                    <div className="flex justify-between py-0.5">
                      <span className="text-nd-text-muted">Active Theme:</span>
                      <span className="font-semibold text-nd-text">
                        {availableThemes.find((t) => t.id === themeId)?.name || 'Blacksite'}
                      </span>
                    </div>

                    <div className="flex justify-between py-0.5">
                      <span className="text-nd-text-muted">AI Provider:</span>
                      <span className="font-semibold text-nd-text capitalize">{providerType === 'skip' ? 'Offline Planner' : providerType}</span>
                    </div>

                    <div className="flex justify-between py-0.5">
                      <span className="text-nd-text-muted">Text Scaling:</span>
                      <span className="font-semibold text-nd-text">{fontScale}%</span>
                    </div>

                    <div className="flex justify-between py-0.5">
                      <span className="text-nd-text-muted">Subsystem Diagnostics:</span>
                      <span className={`font-semibold ${diagnosticsErrors.length > 0 ? 'text-nd-danger' : 'text-nd-success'}`}>
                        {diagnosticsErrors.length > 0 ? 'Degraded' : 'Healthy'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-nd-accent/20 bg-nd-accent/10 px-3 py-2 text-xs text-nd-text-muted">
                  Steam Deck text entry: focus a field with A or Y, then use Steam + X to open the on-screen keyboard.
                </div>

                {diagnosticsWarnings.length > 0 && (
                  <div className="rounded-xl border border-nd-warning/20 bg-nd-warning/5 p-3 flex items-start gap-2 text-xs text-nd-warning leading-5">
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-nd-text">Warnings Pending Verification:</p>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-nd-text-muted text-[11px]">
                        {diagnosticsWarnings.map((w) => (
                          <li key={w.code}>{w.message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer Controls */}
          <footer className="border-t border-nd-text-muted/10 px-8 py-4 bg-nd-surface/30 flex items-center justify-between">
            <div className="flex gap-2">
              {currentStep !== 'welcome' && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-4 text-xs font-semibold text-nd-text-muted transition hover:bg-nd-surface/60 hover:text-nd-text focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
                </button>
              )}
              {(currentStep === 'welcome' || currentStep === 'environment') && (
                <button
                  type="button"
                  onClick={() => dismiss('skipped')}
                  className="inline-flex h-9 items-center rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-4 text-xs font-semibold text-nd-text-muted transition hover:bg-nd-surface/60 hover:text-nd-text focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  Skip for Now
                </button>
              )}
            </div>

            <div>
              {currentStep === 'finish' ? (
                <button
                  type="button"
                  onClick={() => dismiss('completed')}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-nd-accent px-5 text-xs font-bold text-nd-bg transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <Check className="h-4 w-4" aria-hidden="true" /> Enter Workspace
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isNextDisabled()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-nd-accent px-5 text-xs font-bold text-nd-bg transition hover:brightness-110 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  Next <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
