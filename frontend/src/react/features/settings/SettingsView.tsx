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
  HardDrive,
  Shield,
  Sliders,
  ChevronRight,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Panel } from "../../components/primitives/Panel";
import { LiveWallpaperPanel } from "./LiveWallpaperPanel";
import { neurodeckApi, runtimeTypeToProvider } from "../../services/bridgeAdapter";
import { useTheme } from "../../theme/useTheme";
import type {
  AIProvider,
  NeuroDeckAction,
  NeuroDeckAppActions,
  NeuroDeckState,
} from "../../types/neurodeck";
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
  { key: "input", label: "Input", icon: Gamepad2 },
  { key: "performance", label: "Performance", icon: Cpu },
  { key: "extensions", label: "Extensions", icon: Sliders },
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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${checked ? "bg-nd-accent" : "bg-nd-text-muted/20"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-nd-bg shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        style={{ left: "2px" }}
      />
    </button>
  );
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
  const { activeTheme, availableThemes, settings, updateSettings } = useTheme();
  const [activePanel, setActivePanel] = useState<PanelKey>(() => {
    const saved = localStorage.getItem("settingsActivePanel");
    const stripped = saved?.replace("sp-", "") ?? "general";
    return (NAV_PANELS.some((p) => p.key === stripped) ? stripped : "general") as PanelKey;
  });

  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([OFFLINE_PROVIDER]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState(100);
  const [compactMode, setCompactMode] = useState(false);

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
      <aside className="flex min-h-0 flex-col rounded-2xl border border-nd-text-muted/15 bg-nd-surface/50 p-2.5 gap-1">
        <div className="flex items-center gap-2 rounded-xl border border-nd-accent/20 bg-nd-accent/10 px-3 py-2 mb-1">
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
              aria-current={active ? "page" : undefined}
              onClick={() => selectPanel(key)}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                active
                  ? "border-nd-accent/35 bg-nd-accent/10 text-nd-accent font-semibold"
                  : "border-transparent text-nd-text/70 hover:border-nd-text-muted/15 hover:bg-nd-surface/60 hover:text-nd-text"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
            </button>
          );
        })}
      </aside>

      {/* Content */}
      <section className="min-h-0 overflow-y-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4 scrollbar-thin">
        {/* ── General ──────────────────────────────── */}
        {activePanel === "general" && (
          <div className="space-y-4">
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
              <div className="grid gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {availableThemes.map((theme) => {
                  const active = settings.activeThemeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => void updateSettings({ activeThemeId: theme.id })}
                      className={`relative rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                        active
                          ? "border-nd-accent/50 bg-nd-accent/[0.07] shadow-glow"
                          : "border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/25"
                      }`}
                    >
                      {active && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-nd-accent">
                          <Check className="h-3 w-3 text-nd-bg" />
                        </span>
                      )}
                      <div className="mb-2 flex gap-1">
                        {[
                          theme.tokens.color.accent.primary,
                          theme.tokens.color.accent.secondary,
                          theme.tokens.color.text.warning,
                          theme.tokens.color.text.danger,
                          theme.tokens.color.surface.raised,
                        ].map((c) => (
                          <span
                            key={c}
                            className="h-3 flex-1 rounded-full"
                            style={{ backgroundColor: c }}
                          />
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
              <div className="px-4 pb-4">
                <p className="text-xs text-nd-text-muted">
                  Active theme: <strong className="text-nd-text">{activeTheme.name}</strong>
                </p>
                <p className="mt-1 text-xs text-nd-text-muted">
                  Full wallpaper and display tuning remains in the{" "}
                  <strong className="text-nd-text">Themes</strong> tab.
                </p>
              </div>
            </Panel>
          </div>
        )}

        {/* ── AI ───────────────────────────────────── */}
        {activePanel === "ai" && (
          <div className="space-y-4">
            <Panel eyebrow="AI Runtime" title="Provider Selection">
              <div className="space-y-2 p-4">
                {providersLoading && (
                  <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 text-center text-sm text-nd-text-muted">
                    Loading provider runtimes…
                  </div>
                )}
                {providersError && (
                  <div className="flex items-start gap-2 rounded-xl border border-nd-danger/20 bg-nd-danger/10 p-3 text-sm text-nd-danger">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {providersError}
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
                            <BrainCircuit className="h-4 w-4 shrink-0 text-nd-accent" />
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
          <div className="space-y-4">
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

        {/* ── Input ────────────────────────────────── */}
        {activePanel === "input" && (
          <div className="space-y-4">
            <Panel eyebrow="Controller" title="Steam Deck Input">
              <div className="space-y-2 p-4">
                <SettingRow
                  icon={Gamepad2}
                  title="Deck Mode"
                  description="Larger touch targets and controller-first focus affordances."
                >
                  <Toggle
                    checked={state.deckMode}
                    onChange={() => dispatch({ type: "toggle-deck-mode" })}
                    label="Toggle Deck Mode"
                  />
                </SettingRow>
                <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 space-y-2 text-xs text-nd-text-muted">
                  <p className="font-semibold text-nd-text text-sm">Default bindings</p>
                  {[
                    ["Back / ` (backtick)", "Open radial menu"],
                    ["L2", "Radial menu (gamepad)"],
                    ["A", "Accept / confirm"],
                    ["B", "Back / dismiss"],
                    ["R5", "Command palette"],
                    ["L4 + R4", "Accept completion"],
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
          </div>
        )}

        {/* ── Performance ──────────────────────────── */}
        {activePanel === "performance" && (
          <div className="space-y-4">
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
          <div className="space-y-4">
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
                  <RefreshCcw className="h-4 w-4" /> Refresh Diagnostics
                </button>
                <button
                  type="button"
                  onClick={() => void actions.exportSession()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2.5 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <FileDown className="h-4 w-4" /> Export Active Session
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
                  <FileArchive className="h-4 w-4" /> Export Diagnostics Bundle
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

        {/* ── Privacy ──────────────────────────────── */}
        {activePanel === "privacy" && (
          <div className="space-y-4">
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
                <button
                  type="button"
                  onClick={() => void actions.resetLocalState()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-danger/25 bg-nd-danger/10 px-3 py-2.5 text-sm font-semibold text-nd-danger transition hover:bg-nd-danger/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
                >
                  <RotateCcw className="h-4 w-4" /> Reset Stored UI State
                </button>
              </div>
            </Panel>

            <Panel eyebrow="About" title="NEURODECK">
              <div className="p-4 space-y-1.5 text-xs text-nd-text-muted">
                {[
                  ["Version", "v1.8.0 — Ptah"],
                  ["Runtime", "Electron + axum"],
                  ["Bridge", "localhost:9477"],
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
