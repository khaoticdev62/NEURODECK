import { useEffect, useState } from "react";
import type { Dispatch } from "react";
import {
  BrainCircuit,
  FileArchive,
  FileDown,
  Gamepad2,
  Palette,
  RefreshCcw,
  Rocket,
  RotateCcw,
  Settings,
  Cpu,
  Shield,
  Sliders,
  ChevronRight,
  Check,
  AlertTriangle,
  Package,
  MonitorPlay,
  Volume2,
} from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { LoadingState } from "../../components/primitives/LoadingState";
import { Panel } from "../../components/primitives/Panel";
import { Toggle } from "../../components/primitives/Toggle";
import { useController } from "../../input/controller/ControllerProvider";
import { LiveWallpaperPanel } from "./LiveWallpaperPanel";
import { PackagesPanel } from "./PackagesPanel";
import { bridgeInvoke, neurodeckApi, runtimeTypeToProvider } from "../../services/bridgeAdapter";
import { useTheme } from "../../theme/useTheme";
import type {
  AIProvider,
  NeuroDeckAction,
  NeuroDeckAppActions,
  NeuroDeckState,
} from "../../types/neurodeck";
import type { RuntimeManifest } from "../../types/preload-surface";
import type { ProviderRuntimeProfile } from "../../../shared/contracts/models.contracts";

type ProviderOption = { id: AIProvider; runtimeId: string; label: string; description: string };

const OFFLINE_PROVIDER: ProviderOption = {
  id: "offline-draft",
  runtimeId: "offline-draft",
  label: "Offline Draft",
  description: "Always-available deterministic planning fallback.",
};

const NAV_PANELS = [
  { key: "general", label: "General", icon: Settings },
  { key: "ai", label: "AI", icon: BrainCircuit },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "voice", label: "Voice", icon: Volume2 },
  { key: "input", label: "Input", icon: Gamepad2 },
  { key: "performance", label: "Performance", icon: Cpu },
  { key: "extensions", label: "Extensions", icon: Sliders },
  { key: "packages", label: "Packages", icon: Package },
  { key: "privacy", label: "Privacy", icon: Shield },
] as const;

type PanelKey = (typeof NAV_PANELS)[number]["key"];

function describeRuntime(runtime: ProviderRuntimeProfile): string {
  const parts: string[] = [];
  if (runtime.baseUrl) parts.push(runtime.baseUrl);
  const caps = Object.entries(runtime.supports)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase());
  if (caps.length) parts.push(`supports ${caps.slice(0, 3).join(", ")}`);
  return parts.length ? parts.join(" · ") : runtime.label;
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="h-5 w-5 shrink-0 text-nd-accent" />
        <div className="min-w-0">
          <p className="font-semibold text-nd-text text-sm">{title}</p>
          <p className="text-xs text-nd-text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// --- Theme Live Preview Mockup -------------------------------------------
// Renders a self-contained miniature NEURODECK UI using the supplied theme
// token colors as inline styles. aria-hidden because it is decorative.
interface ThemePreviewColors {
  surface: { app: string; sidebar: string; base: string; raised: string; input: string };
  text: { primary: string; muted: string };
  accent: { primary: string };
  border: { default: string; subtle: string };
  state: { success: string; warning: string; error: string };
}
function ThemePreviewMockup({ name, color }: { name: string; color: ThemePreviewColors }) {
  const c = color;
  return (
    <div
      aria-hidden="true"
      title={`Preview: ${name}`}
      className="relative overflow-hidden rounded-xl border select-none transition-all duration-200"
      style={{ height: '150px', background: c.surface.app, borderColor: c.border.default }}
    >
      {/* Sidebar strip */}
      <div
        className="absolute inset-y-0 left-0 flex flex-col items-center gap-2 py-3"
        style={{ width: '36px', background: c.surface.sidebar, borderRight: `1px solid ${c.border.subtle}` }}
      >
        <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: c.accent.primary }} />
        {[0.35, 0.25, 0.2].map((op, i) => (
          <div key={i} style={{ width: '14px', height: '14px', borderRadius: '4px', background: c.text.muted, opacity: op }} />
        ))}
      </div>

      {/* Main pane */}
      <div className="absolute inset-0" style={{ left: '36px', padding: '10px 10px 8px' }}>
        {/* Topbar */}
        <div className="flex items-center gap-1.5 mb-2">
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: c.accent.primary }} />
          <div style={{ height: '3px', borderRadius: '2px', background: c.text.muted, width: '50px', opacity: 0.45 }} />
          <div style={{ marginLeft: 'auto', width: '32px', height: '13px', borderRadius: '5px', background: c.accent.primary, opacity: 0.85 }} />
        </div>

        {/* Response card */}
        <div className="mb-2 rounded-lg p-1.5" style={{ background: c.surface.raised, border: `1px solid ${c.border.subtle}` }}>
          <div style={{ height: '3px', borderRadius: '2px', background: c.text.primary, width: '78%', marginBottom: '4px', opacity: 0.75 }} />
          <div style={{ height: '3px', borderRadius: '2px', background: c.text.muted, width: '60%', marginBottom: '3px', opacity: 0.5 }} />
          <div style={{ height: '3px', borderRadius: '2px', background: c.text.muted, width: '42%', opacity: 0.35 }} />
        </div>

        {/* Input row */}
        <div className="flex items-center gap-1.5 mb-2">
          <div style={{ flex: 1, height: '16px', borderRadius: '5px', background: c.surface.input, border: `1px solid ${c.border.default}` }} />
          <div style={{ width: '20px', height: '16px', borderRadius: '5px', background: c.accent.primary, opacity: 0.9 }} />
        </div>

        {/* State pills */}
        <div className="flex gap-1">
          <div style={{ height: '3px', borderRadius: '2px', flex: 3, background: c.accent.primary }} />
          <div style={{ height: '3px', borderRadius: '2px', flex: 1, background: c.state.success, opacity: 0.75 }} />
          <div style={{ height: '3px', borderRadius: '2px', flex: 1, background: c.state.warning, opacity: 0.75 }} />
          <div style={{ height: '3px', borderRadius: '2px', flex: 1, background: c.state.error, opacity: 0.75 }} />
        </div>
      </div>
    </div>
  );
}
// -------------------------------------------------------------------------

export function SettingsView({
  state,
  dispatch,
  actions,
  onPanelChange,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
  onPanelChange?: (panel: string) => void;
  onClose?: () => void;
}) {
  const { activeTheme, availableThemes, settings, updateSettings, resetToDefaults } = useTheme();
  const { runtime, settings: controllerSettings, setDebugOverlayOpen } = useController();
  const [activePanel, setActivePanel] = useState<PanelKey>(() => {
    const saved = localStorage.getItem("settingsActivePanel");
    const stripped = saved?.replace("sp-", "") ?? "general";
    return (NAV_PANELS.some((p) => p.key === stripped) ? stripped : "general") as PanelKey;
  });

  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([OFFLINE_PROVIDER]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [providerRetryCount, setProviderRetryCount] = useState(0);
  const [runtimeManifest, setRuntimeManifest] = useState<RuntimeManifest | null>(null);
  const [fontScale, setFontScale] = useState(100);
  const [compactMode, setCompactMode] = useState(false);
  const [ttsMode, setTtsMode] = useState<"off" | "complete" | "stream">(() => {
    const saved = localStorage.getItem("neurodeck_tts_mode");
    return (saved === "complete" || saved === "stream" ? saved : "off") as "off" | "complete" | "stream";
  });
  const [ttsTesting, setTtsTesting] = useState(false);
  const [pendingThemeId, setPendingThemeId] = useState<string | null>(null);
  const [hoveredThemeId, setHoveredThemeId] = useState<string | null>(null);

  const handleTtsModeChange = (mode: "off" | "complete" | "stream") => {
    setTtsMode(mode);
    localStorage.setItem("neurodeck_tts_mode", mode);
  };

  const handleTtsTest = async () => {
    setTtsTesting(true);
    try {
      await bridgeInvoke("speak_text", { text: "NEURODECK voice output test. Text-to-speech is working." });
    } catch (_) {
      // Ignore — TTS may not be available on this platform
    } finally {
      setTtsTesting(false);
    }
  };

  useEffect(() => {
    setFontScale(settings.fontScale);
    setCompactMode(settings.compactMode);
  }, [settings.compactMode, settings.fontScale]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setProvidersLoading(true);
        setProvidersError(null);
        const runtimes = await neurodeckApi.models.listProviderRuntimes();
        const seen = new Set<string>(["offline-draft"]);
        const options: ProviderOption[] = [OFFLINE_PROVIDER];
        for (const runtime of runtimes) {
          const id = runtimeTypeToProvider(runtime.type);
          if (seen.has(id)) continue;
          seen.add(id);
          options.push({
            id,
            runtimeId: runtime.id,
            label: runtime.label || id,
            description: describeRuntime(runtime),
          });
        }
        if (!cancelled) setProviderOptions(options);
      } catch (e) {
        if (!cancelled) {
          setProvidersError(String(e));
          setProviderOptions([OFFLINE_PROVIDER]);
        }
      } finally {
        if (!cancelled) setProvidersLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [providerRetryCount]);

  useEffect(() => {
    let cancelled = false;
    async function loadRuntimeManifest() {
      try {
        const manifest = await window.electronAPI?.getRuntimeManifest?.();
        if (!cancelled && manifest) {
          setRuntimeManifest(manifest);
        }
      } catch (_) {
        // Fallback to static labels below.
      }
    }
    void loadRuntimeManifest();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectPanel = (name: PanelKey) => {
    localStorage.setItem("settingsActivePanel", `sp-${name}`);
    setActivePanel(name);
    onPanelChange?.(name);
  };

  const applyFontScale = (val: number) => {
    setFontScale(val);
    void updateSettings({ fontScale: val });
    document.documentElement.style.fontSize = `${val}%`;
  };

  const applyCompactMode = (val: boolean) => {
    setCompactMode(val);
    void updateSettings({ compactMode: val });
    if (state.deckMode !== val) {
      dispatch({ type: "toggle-deck-mode" });
    }
  };

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-hidden p-3 xl:grid-cols-[220px_1fr]">
      {/* Sidebar */}
      <aside className="stv-sidebar flex min-h-0 flex-col rounded-2xl border border-nd-text-muted/15 bg-nd-surface/50 p-2.5 gap-1">
        <div className="stv-sidebar-brand-chip flex items-center gap-2 rounded-xl border border-nd-accent/20 bg-nd-accent/10 px-3 py-2 mb-1">
          <Settings className="h-4 w-4 text-nd-accent" />
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-nd-accent">
            Settings
          </span>
        </div>
        {NAV_PANELS.map(({ key, label, icon: Icon }) => {
          const active = activePanel === key;
          return (
            <button
              key={key}
              type="button"
              data-testid={`settings-tab-${key}`}
              data-panel={`sp-${key}`}
              aria-current={active ? "page" : undefined}
              onClick={() => selectPanel(key)}
              className={`stv-nav-item flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                active
                  ? "active border-nd-accent/35 bg-nd-accent/10 text-nd-accent font-semibold"
                  : "border-transparent text-nd-text/70 hover:border-nd-text-muted/15 hover:bg-nd-surface/60 hover:text-nd-text"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />}
            </button>
          );
        })}
      </aside>

      {/* Content */}
      <section className="min-h-0 overflow-y-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4 scrollbar-thin">
        {/* ── General ──────────────────────────────── */}
        {activePanel === "general" && (
          <div id="sp-general" className="settings-panel active space-y-4">
            <Panel eyebrow="Application" title="General Settings">
              <div className="space-y-2 p-4">
                <SettingRow
                  icon={Rocket}
                  title="Onboarding Wizard"
                  description="Display the welcome wizard on next app launch."
                >
                  <Toggle
                    checked={state.showOnboarding}
                    onChange={() => dispatch({ type: "toggle-onboarding" })}
                    label="Toggle onboarding wizard"
                  />
                </SettingRow>
                <div className="grid gap-2 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "open-onboarding", mode: "tour" })}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                  >
                    <MonitorPlay className="h-4 w-4" aria-hidden="true" />
                    Replay Tour
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "open-onboarding", mode: "contextual" })}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                  >
                    <Rocket className="h-4 w-4" aria-hidden="true" />
                    Show Current Tool
                  </button>
                </div>
                <SettingRow
                  icon={Gamepad2}
                  title="Deck Mode"
                  description="Controller-first layout — larger targets, tighter density."
                >
                  <Toggle
                    checked={state.deckMode}
                    onChange={() => dispatch({ type: "toggle-deck-mode" })}
                    label="Toggle Deck Mode"
                  />
                </SettingRow>
              </div>
            </Panel>

            <Panel eyebrow="Theme Engine" title="Quick Theme Picker">
              {availableThemes.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={Palette}
                    title="Theme settings unavailable."
                    description="Theme data could not be loaded. Reset appearance to restore defaults."
                    action={
                      <button
                        type="button"
                        onClick={() => void resetToDefaults()}
                        className="inline-flex items-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-4 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset Appearance
                      </button>
                    }
                  />
                </div>
              ) : (() => {
                // Resolve which theme to show in the preview pane:
                // hovered > pending > currently active
                const previewId = hoveredThemeId ?? pendingThemeId ?? settings.activeThemeId;
                const previewTheme = availableThemes.find((t) => t.id === previewId) ?? activeTheme;
                const hasPendingChange = pendingThemeId !== null && pendingThemeId !== settings.activeThemeId;
                return (
                  <div id="theme-cards-grid">
                    <div className="grid gap-4 p-4 lg:grid-cols-[1fr_200px]">
                      {/* Left: theme card grid */}
                      <div
                        className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
                        onMouseLeave={() => setHoveredThemeId(null)}
                      >
                        {availableThemes.map((theme) => {
                          const isActive = settings.activeThemeId === theme.id;
                          const isPending = pendingThemeId === theme.id && !isActive;
                          return (
                            <button
                              key={theme.id}
                              type="button"
                              data-testid="theme-card"
                              onMouseEnter={() => setHoveredThemeId(theme.id)}
                              onClick={() => setPendingThemeId((prev) => prev === theme.id ? null : theme.id)}
                              aria-pressed={isActive}
                              className={`onboarding-theme-card relative rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                                isActive
                                  ? "border-nd-success/40 bg-nd-success/[0.05]"
                                  : isPending
                                  ? "border-nd-accent/50 bg-nd-accent/[0.07] shadow-glow"
                                  : "border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/25"
                              }`}
                            >
                              {isActive && (
                                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-nd-success" aria-label="Active theme">
                                  <Check className="h-3 w-3 text-nd-bg" />
                                </span>
                              )}
                              {isPending && (
                                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border border-nd-accent/40 bg-nd-accent/20 text-[8px] font-bold text-nd-accent">
                                  ▶
                                </span>
                              )}
                              <div className="mb-2 flex gap-1">
                                {[
                                  theme.tokens.color.accent.primary,
                                  theme.tokens.color.accent.secondary,
                                  theme.tokens.color.text.warning,
                                  theme.tokens.color.text.danger,
                                  theme.tokens.color.surface.raised,
                                ].map((c, i) => (
                                  <span key={i} className="h-3 flex-1 rounded-full" style={{ backgroundColor: c }} />
                                ))}
                              </div>
                              <p className="text-xs font-semibold text-nd-text truncate">{theme.name}</p>
                              <p className="mt-1 text-[11px] leading-4 text-nd-text-muted line-clamp-2">
                                {theme.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Right: live preview pane */}
                      <div className="flex flex-col gap-3">
                        <ThemePreviewMockup
                          name={previewTheme.name}
                          color={previewTheme.tokens.color}
                        />
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-nd-text truncate">{previewTheme.name}</p>
                          <p className="text-[11px] text-nd-text-muted leading-4 line-clamp-2">
                            {hoveredThemeId
                              ? "Hover to preview — click to select"
                              : hasPendingChange
                              ? "Selected — click Apply to switch"
                              : "Currently active"}
                          </p>
                        </div>

                        {/* Apply / Cancel controls */}
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            disabled={!hasPendingChange}
                            onClick={() => {
                              if (pendingThemeId) {
                                void updateSettings({ activeThemeId: pendingThemeId });
                                setPendingThemeId(null);
                              }
                            }}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-3 text-xs font-semibold text-nd-accent transition hover:bg-nd-accent/20 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            {hasPendingChange ? "Apply Theme" : "Applied"}
                          </button>
                          {hasPendingChange && (
                            <button
                              type="button"
                              onClick={() => setPendingThemeId(null)}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 text-xs text-nd-text-muted transition hover:border-nd-text-muted/30 hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                            >
                              Cancel
                            </button>
                          )}
                        </div>

                        <p className="text-[10px] text-nd-text-muted/70 leading-4">
                          Full wallpaper and display tuning in the <strong className="text-nd-text-muted">Themes</strong> tab.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Panel>
          </div>
        )}

        {/* ── AI ───────────────────────────────────── */}
        {activePanel === "ai" && (
          <div id="sp-ai" className="settings-panel active space-y-4">
            <Panel eyebrow="AI Runtime" title="Provider Selection">
              <div className="space-y-2 p-4">
                {providersLoading && (
                  <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
                    <LoadingState size="sm" label="Loading provider runtimes…" />
                  </div>
                )}
                {providersError && (
                  <div className="flex items-start justify-between gap-2 rounded-xl border border-nd-danger/20 bg-nd-danger/10 p-3 text-sm text-nd-danger">
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{providersError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProviderRetryCount((n) => n + 1)}
                      className="shrink-0 rounded-lg border border-nd-danger/30 bg-nd-danger/10 px-2 py-1 text-xs font-semibold text-nd-danger transition hover:bg-nd-danger/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-danger/40"
                    >
                      <RefreshCcw className="inline h-3 w-3 mr-1" aria-hidden="true" />Retry
                    </button>
                  </div>
                )}
                {!providersLoading &&
                  providerOptions.map((provider) => {
                    const health = state.aiHealth.find((item) => item.provider === provider.id);
                    const active = state.selectedProvider === provider.id;
                    return (
                      <button
                        key={provider.runtimeId}
                        type="button"
                        onClick={() => {
                          dispatch({ type: "set-provider", provider: provider.id });
                          void neurodeckApi.ai.setProvider(provider.id);
                        }}
                        className={`w-full rounded-xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                          active
                            ? "border-nd-accent/40 bg-nd-accent/[0.07]"
                            : "border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/25"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <BrainCircuit className="h-4 w-4 shrink-0 text-nd-accent" aria-hidden="true" />
                            <span className="font-semibold text-nd-text text-sm truncate">
                              {provider.label}
                            </span>
                          </div>
                          <Badge
                            tone={
                              health?.available
                                ? "success"
                                : provider.id === "offline-draft"
                                  ? "success"
                                  : "warning"
                            }
                          >
                            {health?.available ? "ready" : "cold"}
                          </Badge>
                        </div>
                        <p className="mt-1.5 text-xs text-nd-text-muted leading-5">
                          {provider.description}
                        </p>
                        {health?.detail && (
                          <p className="mt-1 text-xs text-nd-text-muted/60">{health.detail}</p>
                        )}
                      </button>
                    );
                  })}
                <button
                  type="button"
                  onClick={() => void actions.checkAiHealth()}
                  className="w-full rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  Check AI Health
                </button>
              </div>
            </Panel>
          </div>
        )}

        {/* ── Appearance ───────────────────────────── */}
        {activePanel === "appearance" && (
          <div id="sp-appearance" className="settings-panel active space-y-4">
            <Panel eyebrow="Display" title="Font Scale">
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between text-sm text-nd-text-muted">
                  <span>Scale</span>
                  <span className="font-mono text-nd-accent">{fontScale}%</span>
                </div>
                <input
                  type="range"
                  min={75}
                  max={130}
                  step={5}
                  value={fontScale}
                  onChange={(e) => applyFontScale(Number(e.target.value))}
                  className="w-full accent-nd-accent"
                  aria-label="Font scale percentage"
                />
                <div className="flex justify-between text-xs text-nd-text-muted/60">
                  <span>75%</span>
                  <span>100%</span>
                  <span>130%</span>
                </div>
              </div>
            </Panel>

            <Panel eyebrow="Layout" title="Compact Mode">
              <div className="p-4">
                <SettingRow
                  icon={Sliders}
                  title="Compact Layout"
                  description="Tighter spacing for maximum information density."
                >
                  <Toggle
                    checked={compactMode}
                    onChange={() => applyCompactMode(!compactMode)}
                    label="Toggle compact mode"
                  />
                </SettingRow>
              </div>
            </Panel>

            <Panel eyebrow="Appearance" title="Live Wallpaper">
              <div className="p-4">
                <LiveWallpaperPanel />
              </div>
            </Panel>
          </div>
        )}

        {/* ── Voice ────────────────────────────────── */}
        {activePanel === "voice" && (
          <div id="sp-voice" className="settings-panel active space-y-4">
            <Panel eyebrow="Text-to-Speech" title="TTS Mode">
              <div className="space-y-3 p-4">
                <p className="text-xs text-nd-text-muted leading-5">
                  Choose when NEURODECK speaks AI responses aloud. Requires espeak-ng (Linux),
                  say (macOS), or Windows Speech API.
                </p>
                {(
                  [
                    { value: "off", label: "Off", desc: "No voice output." },
                    { value: "complete", label: "After Response", desc: "Speaks the full response once generation finishes." },
                    { value: "stream", label: "Stream Sentences", desc: "Speaks each sentence as it arrives — minimum latency." },
                  ] as const
                ).map(({ value, label, desc }) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                      ttsMode === value
                        ? "border-nd-accent/40 bg-nd-accent/[0.07]"
                        : "border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tts-mode"
                      value={value}
                      checked={ttsMode === value}
                      onChange={() => handleTtsModeChange(value)}
                      className="mt-0.5 accent-[var(--nd-accent)]"
                    />
                    <div>
                      <p className="font-semibold text-sm text-nd-text">{label}</p>
                      <p className="text-xs text-nd-text-muted mt-0.5">{desc}</p>
                    </div>
                    {ttsMode === value && (
                      <Check className="ml-auto h-4 w-4 shrink-0 text-nd-accent" aria-hidden="true" />
                    )}
                  </label>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Test" title="Voice Output Test">
              <div className="p-4 space-y-3">
                <p className="text-xs text-nd-text-muted">
                  Plays a short sample phrase through the TTS engine to verify it is working.
                </p>
                <button
                  type="button"
                  disabled={ttsTesting}
                  onClick={() => void handleTtsTest()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2.5 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  {ttsTesting ? "Speaking…" : "Test Voice Output"}
                </button>
              </div>
            </Panel>
          </div>
        )}

        {/* ── Input ────────────────────────────────── */}
        {activePanel === "input" && (
          <div id="sp-input" className="settings-panel active space-y-4">
            <Panel eyebrow="Controller" title="Full Application Controller Support">
              <div className="space-y-2 p-4">
                <SettingRow
                  icon={Gamepad2}
                  title="Controller Support"
                  description="Enable semantic controller actions across shell, dialogs, forms, and views."
                >
                  <Toggle
                    checked={controllerSettings.enabled}
                    onChange={() =>
                      dispatch({
                        type: "set-controller-settings",
                        settings: { enabled: !controllerSettings.enabled },
                      })
                    }
                    label="Toggle controller support"
                  />
                </SettingRow>
                <SettingRow
                  icon={ChevronRight}
                  title="Deck Mode Layout"
                  description="Larger touch targets and controller-first focus affordances."
                >
                  <Toggle
                    checked={state.deckMode}
                    onChange={() => dispatch({ type: "toggle-deck-mode" })}
                    label="Toggle Deck Mode"
                  />
                </SettingRow>
                <SettingRow
                  icon={Palette}
                  title="Show Controller Hints"
                  description="Keep contextual controller prompts visible at Steam Deck resolution."
                >
                  <Toggle
                    checked={controllerSettings.showHints}
                    onChange={() =>
                      dispatch({
                        type: "set-controller-settings",
                        settings: { showHints: !controllerSettings.showHints },
                      })
                    }
                    label="Toggle controller hints"
                  />
                </SettingRow>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
                    <span className="mb-2 block text-xs font-semibold text-nd-text">Preferred profile</span>
                    <select
                      value={controllerSettings.preferredProfile}
                      onChange={(event) =>
                        dispatch({
                          type: "set-controller-settings",
                          settings: {
                            preferredProfile: event.target.value as typeof controllerSettings.preferredProfile,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3 py-2 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                    >
                      <option value="steam_deck">Steam Deck</option>
                      <option value="xbox">Xbox</option>
                      <option value="playstation">PlayStation</option>
                      <option value="generic">Generic</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                  <label className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
                    <span className="mb-2 block text-xs font-semibold text-nd-text">Glyph style</span>
                    <select
                      value={controllerSettings.glyphStyle}
                      onChange={(event) =>
                        dispatch({
                          type: "set-controller-settings",
                          settings: {
                            glyphStyle: event.target.value as typeof controllerSettings.glyphStyle,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3 py-2 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                    >
                      <option value="auto">Auto detect</option>
                      <option value="steam_deck">Steam Deck</option>
                      <option value="xbox">Xbox</option>
                      <option value="playstation">PlayStation</option>
                      <option value="generic">Generic</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["Stick deadzone", controllerSettings.stickDeadzone, 0.1, 0.5, 0.01, "stickDeadzone"],
                    ["Trigger threshold", controllerSettings.triggerThreshold, 0.1, 1, 0.01, "triggerThreshold"],
                    ["Repeat delay", controllerSettings.initialRepeatDelayMs, 150, 700, 10, "initialRepeatDelayMs"],
                    ["Repeat rate", controllerSettings.repeatIntervalMs, 40, 180, 5, "repeatIntervalMs"],
                  ].map(([label, value, min, max, step, key]) => (
                    <label key={String(key)} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
                      <span className="flex items-center justify-between text-xs font-semibold text-nd-text">
                        <span>{label}</span>
                        <span className="font-mono text-nd-accent">{value}</span>
                      </span>
                      <input
                        type="range"
                        min={Number(min)}
                        max={Number(max)}
                        step={Number(step)}
                        value={Number(value)}
                        onChange={(event) =>
                          dispatch({
                            type: "set-controller-settings",
                            settings: { [key]: Number(event.target.value) } as never,
                          })
                        }
                        className="mt-2 w-full accent-nd-accent"
                      />
                    </label>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <SettingRow
                    icon={Sliders}
                    title="Haptics"
                    description="Light confirm and warning pulses when supported."
                  >
                    <Toggle
                      checked={controllerSettings.hapticsEnabled}
                      onChange={() =>
                        dispatch({
                          type: "set-controller-settings",
                          settings: { hapticsEnabled: !controllerSettings.hapticsEnabled },
                        })
                      }
                      label="Toggle haptics"
                    />
                  </SettingRow>
                  <SettingRow
                    icon={Gamepad2}
                    title="Text Input Assist"
                    description="Keep fields visible and optimize for Steam + X on-screen keyboard flow."
                  >
                    <Toggle
                      checked={controllerSettings.textInputAssistEnabled}
                      onChange={() =>
                        dispatch({
                          type: "set-controller-settings",
                          settings: {
                            textInputAssistEnabled: !controllerSettings.textInputAssistEnabled,
                          },
                        })
                      }
                      label="Toggle text input assist"
                    />
                  </SettingRow>
                </div>
                <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 space-y-2 text-xs text-nd-text-muted">
                  <p className="font-semibold text-nd-text text-sm">Default bindings</p>
                  {[
                    ["A / Cross", "Confirm and activate"],
                    ["B / Circle", "Back, cancel, close modal"],
                    ["X / Square", "Reload or secondary action"],
                    ["Y / Triangle", "Search or focus input"],
                    ["LB/RB", "Previous and next section"],
                    ["LT/RT", "Page and scroll"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span>{desc}</span>
                      <kbd className="rounded border border-nd-text-muted/20 bg-nd-surface/60 px-2 py-0.5 font-mono text-nd-accent text-[10px]">
                        {key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel eyebrow="Diagnostics" title="Controller Runtime">
              <div className="space-y-3 p-4">
                <div className="grid gap-2 md:grid-cols-2">
                  {[
                    ["Connection", runtime.connectionStatus],
                    ["Last input", runtime.lastInputSource],
                    ["Screen", runtime.currentScreenId],
                    ["Focus zone", runtime.currentFocusZone ?? "unknown"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-nd-text-muted">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-nd-text">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 space-y-2 text-xs text-nd-text-muted">
                  <p className="font-semibold text-nd-text text-sm">Detected devices</p>
                  {runtime.devices.length === 0 && (
                    <p>No controller detected. Keyboard and mouse remain available.</p>
                  )}
                  {runtime.devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between gap-3">
                      <span>{device.name}</span>
                      <kbd className="rounded border border-nd-text-muted/20 bg-nd-surface/60 px-2 py-0.5 font-mono text-nd-accent text-[10px]">
                        {device.kind}
                      </kbd>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setDebugOverlayOpen(true)}
                  className="w-full rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  Open Controller Diagnostics Overlay
                </button>
              </div>
            </Panel>
          </div>
        )}

        {/* ── Performance ──────────────────────────── */}
        {activePanel === "performance" && (
          <div id="sp-performance" className="settings-panel active space-y-4">
            <Panel eyebrow="Runtime" title="Performance Tier">
              <div className="space-y-2 p-4">
                {(["battery", "balanced", "performance", "quality"] as const).map((tier) => {
                  const meta = {
                    battery: {
                      label: "Battery Saver",
                      desc: "Minimal animations, reduced blur, low GPU load.",
                      badge: "muted" as const,
                    },
                    balanced: {
                      label: "Balanced",
                      desc: "Default. Good visuals without draining resources.",
                      badge: "accent" as const,
                    },
                    performance: {
                      label: "Performance",
                      desc: "Full animations, real-time effects, max quality.",
                      badge: "success" as const,
                    },
                    quality: {
                      label: "Ultra Quality",
                      desc: "Max visual fidelity — plugged-in only.",
                      badge: "warning" as const,
                    },
                  }[tier];
                  const active = tier === "balanced";
                  return (
                    <div
                      key={tier}
                      className={`rounded-xl border p-3.5 ${active ? "border-nd-accent/40 bg-nd-accent/[0.07]" : "border-nd-text-muted/15 bg-nd-surface/40"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-nd-text text-sm">{meta.label}</span>
                        {active && <Badge tone="accent">Active</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-nd-text-muted">{meta.desc}</p>
                    </div>
                  );
                })}
                <p className="text-xs text-nd-text-muted/60 pt-1">
                  Performance tier persistence coming in v1.9.
                </p>
              </div>
            </Panel>

            <Panel eyebrow="Diagnostics" title="System Telemetry">
              <div className="p-4 grid gap-2 sm:grid-cols-2">
                {[
                  ["Latency", `${state.telemetry.latencyMs ?? "--"}ms`],
                  ["Context used", `${state.telemetry.contextUsed ?? 0}%`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-4 py-3"
                  >
                    <p className="text-xs text-nd-text-muted">{label}</p>
                    <p className="mt-1 font-mono text-lg font-bold text-nd-accent">{value}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* ── Extensions ───────────────────────────── */}
        {activePanel === "extensions" && (
          <div id="sp-extensions" className="settings-panel active space-y-4">
            <Panel eyebrow="Native Actions" title="Utilities">
              <div className="space-y-2 p-4">
                <button
                  type="button"
                  onClick={async () => {
                    dispatch({ type: "set-busy", label: "Refreshing diagnostic metrics..." });
                    try {
                      const [diag, logs] = await Promise.all([
                        neurodeckApi.diagnostics.get(),
                        neurodeckApi.diagnostics.logs(),
                      ]);
                      dispatch({ type: "set-diagnostics", diagnostics: diag, logs });
                    } catch (e) {
                      dispatch({
                        type: "set-error",
                        error: {
                          title: "Failed to refresh diagnostics",
                          message: String(e),
                          action: "Retry later",
                        },
                      });
                    }
                    dispatch({ type: "set-busy", label: null });
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2.5 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <RefreshCcw className="h-4 w-4" aria-hidden="true" /> Refresh Diagnostics
                </button>
                <button
                  type="button"
                  onClick={() => void actions.exportSession()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2.5 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <FileDown className="h-4 w-4" aria-hidden="true" /> Export Active Session
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    dispatch({
                      type: "set-busy",
                      label: "Exporting sanitized diagnostics bundle...",
                    });
                    const response = await neurodeckApi.diagnostics.exportBundle();
                    if (!response.ok) {
                      dispatch({
                        type: "set-error",
                        error: {
                          title: "Diagnostics export failed",
                          message: response.error,
                          action: "Refresh Diagnostics, then retry.",
                        },
                      });
                    } else {
                      dispatch({ type: "set-export-path", path: response.file });
                    }
                    dispatch({ type: "set-busy", label: null });
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2.5 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <FileArchive className="h-4 w-4" aria-hidden="true" /> Export Diagnostics Bundle
                </button>
              </div>
            </Panel>

            {state.lastExportPath && (
              <Panel eyebrow="Export" title="Last Export">
                <div className="p-4">
                  <p className="rounded-xl border border-nd-success/20 bg-nd-success/10 px-3 py-2 text-xs font-mono text-nd-success break-all">
                    {state.lastExportPath}
                  </p>
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* ── Packages ─────────────────────────────── */}
        {activePanel === "packages" && <PackagesPanel />}

        {/* ── Privacy ──────────────────────────────── */}
        {activePanel === "privacy" && (
          <div id="sp-privacy" className="settings-panel active space-y-4">
            <Panel eyebrow="Storage" title="Local Data">
              <div className="p-4 space-y-4">
                <p className="text-xs leading-5 text-nd-text-muted">
                  All data — settings, project context, AI messages, agent runs, and UI state —
                  persists locally in the Electron userData folder. Nothing is sent to external
                  servers without your explicit action.
                </p>
                <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 space-y-1.5 text-xs text-nd-text-muted">
                  {[
                    ["Sessions", "userData/sessions/"],
                    ["Exports", "userData/exports/"],
                    ["Vector memory", "userData/data/memory/"],
                    ["Profiles", "userData/data/profiles/"],
                    ["Logs", "userData/logs/"],
                  ].map(([label, path]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-nd-text">{label}</span>
                      <span className="font-mono text-nd-text-muted/70">{path}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel eyebrow="Danger Zone" title="Reset">
              <div className="p-4 space-y-3">
                <p className="text-xs text-nd-text-muted">
                  Clears stored UI preferences, active session, and cached context. Does not delete
                  sessions or exports from disk.
                </p>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => void actions.resetLocalState()}
                  icon={RotateCcw}
                >
                  Reset Stored UI State
                </Button>
              </div>
            </Panel>

            <Panel eyebrow="About" title="NEURODECK">
              <div className="p-4 space-y-1.5 text-xs text-nd-text-muted">
                {[
                  ["Version", runtimeManifest ? `v${runtimeManifest.version}` : "Unknown"],
                  ["Build", runtimeManifest?.buildId ?? "Unknown"],
                  ["Runtime", "Electron + axum"],
                  ["Bridge", "localhost:9477"],
                  ["Targets", runtimeManifest?.supportedTargets?.join(", ") ?? "Unknown"],
                  ["License", "UNLICENSED — Khaotic Labs"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1"
                  >
                    <span className="text-nd-text/60">{label}</span>
                    <span className="font-mono text-nd-text">{value}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </section>
    </div>
  );
}
