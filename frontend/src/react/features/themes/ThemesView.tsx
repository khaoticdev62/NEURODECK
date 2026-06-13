import { useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  Monitor,
  Eye,
  Sliders,
  ShieldAlert,
  Sparkles,
  Layers,
} from "lucide-react";

import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { Panel } from "../../components/primitives/Panel";
import { Select } from "../../components/primitives/Select";
import { Toggle } from "../../components/primitives/Toggle";
import { useTheme } from "../../theme/useTheme";
import type { AccessibilityProfile, ThemeDisplayTarget } from "../../../shared/theme/themeContracts";

const THEME_SETTINGS_KEYS = [
  "activeThemeId",
  "activeWallpaperId",
  "liveWallpaperEnabled",
  "displayProfile",
  "performanceTier",
  "accessibilityProfile",
  "wallpaperIntensity",
  "wallpaperOpacity",
  "glowIntensity",
  "glassIntensity",
  "motionIntensity",
  "fontScale",
  "compactMode",
];

function isPartialThemeSettings(value: unknown): value is Partial<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function ThemesView() {
  const {
    settings,
    activeTheme,
    resolvedTokens,
    availableThemes,
    availableWallpapers,
    updateSettings,
    resetToDefaults,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<"themes" | "wallpapers" | "settings" | "diagnostics">(
    "themes"
  );
  const [showTokenInspector, setShowTokenInspector] = useState(false);
  const [exportStr, setExportStr] = useState("");
  const [importStr, setImportStr] = useState("");

  const handleExport = () => {
    setExportStr(JSON.stringify(settings, null, 2));
  };

  const [importMessage, setImportMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importStr);
      if (!isPartialThemeSettings(parsed)) {
        setImportMessage({ text: "Invalid theme settings object.", ok: false });
        setTimeout(() => setImportMessage(null), 3000);
        return;
      }
      const unknownKeys = Object.keys(parsed).filter((k) => !THEME_SETTINGS_KEYS.includes(k));
      if (unknownKeys.length > 0) {
        setImportMessage({ text: `Unknown keys: ${unknownKeys.join(", ")}`, ok: false });
        setTimeout(() => setImportMessage(null), 3000);
        return;
      }
      updateSettings(parsed);
      setImportMessage({ text: "Theme settings imported successfully.", ok: true });
    } catch (_) {
      setImportMessage({ text: "Invalid JSON — check format and try again.", ok: false });
    }
    setTimeout(() => setImportMessage(null), 3000);
  };

  return (
    <Panel
      eyebrow="Appearance"
      title="Supreme Theme System"
      className="h-full overflow-hidden flex flex-col"
    >
      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-nd-text-muted/15 px-4 py-2 bg-nd-surface/30">
        <div role="tablist" aria-label="Theme settings sections" className="flex gap-2">
          {(["themes", "wallpapers", "settings", "diagnostics"] as const).map((tab) => (
            <Button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              variant={activeTab === tab ? "primary" : "ghost"}
              size="sm"
            >
              {tab}
            </Button>
          ))}
        </div>
        <IconButton
          className="ml-auto"
          aria-label="Reset settings to defaults"
          variant="outline"
          size="md"
          onClick={resetToDefaults}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {activeTab === "themes" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {availableThemes.map((theme) => {
                const active = settings.activeThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${theme.name}${active ? ' (active)' : ''}`}
                    onClick={() => updateSettings({ activeThemeId: theme.id })}
                    className={`group relative rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent ${
                      active
                        ? "border-nd-accent/50 bg-nd-accent/[0.07] shadow-glow"
                        : "border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/30 hover:bg-nd-accent/[0.04]"
                    }`}
                  >
                    {active && (
                      <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-nd-accent" aria-hidden="true" />
                    )}

                    {/* Color Swatch Strip */}
                    <div className="mb-3 flex h-6 overflow-hidden rounded-lg">
                      <div
                        className="flex-1"
                        style={{ background: theme.tokens.color.surface.app }}
                      />
                      <div
                        className="flex-1"
                        style={{ background: theme.tokens.color.surface.raised }}
                      />
                      <div
                        className="w-6"
                        style={{ background: theme.tokens.color.accent.primary }}
                      />
                      <div
                        className="w-6"
                        style={{ background: theme.tokens.color.text.primary }}
                      />
                    </div>

                    <p className="text-sm font-semibold text-nd-text">{theme.name}</p>
                    <p className="mt-1 text-[11px] text-nd-text-muted leading-relaxed line-clamp-2">
                      {theme.description}
                    </p>

                    <div className="mt-3 flex gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-nd-surface text-nd-text-muted">
                        {theme.category}
                      </span>
                      {theme.steamDeck.oledTuned && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-nd-accent/10 text-nd-accent">
                          OLED
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === "wallpapers" && (
            <div className="flex flex-col gap-6">
              {/* Wallpaper settings inputs */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-nd-text">Live Wallpaper</label>
                    <Toggle
                      checked={settings.liveWallpaperEnabled}
                      onChange={() => updateSettings({ liveWallpaperEnabled: !settings.liveWallpaperEnabled })}
                      label="Toggle live wallpaper"
                    />
                  </div>
                  <p className="text-xs text-nd-text-muted">
                    Enable beautiful dynamic particles or CSS mesh gradients. Disabled on reduced
                    motion.
                  </p>
                </div>

                <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="wall-opacity" className="text-sm font-semibold text-nd-text">
                      Background Opacity
                    </label>
                    <span className="text-xs text-nd-accent font-semibold">
                      {settings.wallpaperOpacity}%
                    </span>
                  </div>
                  <input
                    id="wall-opacity"
                    type="range"
                    min={0}
                    max={80}
                    step={5}
                    value={settings.wallpaperOpacity}
                    onChange={(e) => updateSettings({ wallpaperOpacity: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer accent-nd-accent bg-nd-surface rounded-lg"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* None option */}
                <button
                  type="button"
                  onClick={() => updateSettings({ activeWallpaperId: "none" })}
                  className={`flex flex-col rounded-2xl border text-left overflow-hidden transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent ${
                    settings.activeWallpaperId === "none"
                      ? "border-nd-accent bg-nd-accent/[0.04]"
                      : "border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/30"
                  }`}
                >
                  <div className="h-20 w-full bg-[#000000] flex items-center justify-center border-b border-nd-text-muted/10">
                    <Layers className="h-6 w-6 text-nd-text-muted/50" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-nd-text">Solid Black</p>
                    <p className="text-[10px] text-nd-text-muted mt-1 leading-normal">
                      Disable wallpaper rendering entirely to optimize battery life.
                    </p>
                  </div>
                </button>

                {availableWallpapers.map((wp) => {
                  const active = settings.activeWallpaperId === wp.id;
                  return (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() => updateSettings({ activeWallpaperId: wp.id })}
                      className={`flex flex-col rounded-2xl border text-left overflow-hidden transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent ${
                        active
                          ? "border-nd-accent bg-nd-accent/[0.04] shadow-glow"
                          : "border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/30"
                      }`}
                    >
                      {/* Swatch / preview mockup */}
                      <div
                        className="h-20 w-full border-b border-nd-text-muted/10"
                        style={{
                          background: `linear-gradient(135deg, ${wp.visuals.basePalette[0]}22 0%, ${resolvedTokens.color.surface.app} 100%)`,
                        }}
                      />
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-nd-text">{wp.name}</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider text-nd-accent px-1.5 py-0.5 rounded bg-nd-accent/10">
                            {wp.renderer}
                          </span>
                        </div>
                        <p className="text-[10px] text-nd-text-muted mt-1 leading-normal line-clamp-2">
                          {wp.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="flex flex-col gap-6">
              {/* Display & Accessibility Selectors */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 flex flex-col gap-2">
                  <label
                    htmlFor="display-profile"
                    className="text-sm font-semibold text-nd-text flex items-center gap-1.5"
                  >
                    <Monitor className="h-4 w-4 text-nd-accent" aria-hidden="true" /> Display Profile
                  </label>
                  <Select
                    value={settings.displayProfile}
                    onChange={(e) => updateSettings({ displayProfile: e.target.value as ThemeDisplayTarget })}
                    options={[
                      { value: "steamdeck_lcd", label: "Steam Deck LCD (Contrast Boost)" },
                      { value: "steamdeck_oled", label: "Steam Deck OLED (Absolute Black)" },
                      { value: "desktop_1080p", label: "Desktop (1080p Standard)" },
                      { value: "docked_tv", label: "Docked TV (Readable Boost)" },
                    ]}
                  />
                </div>

                <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 flex flex-col gap-2">
                  <label
                    htmlFor="accessibility-profile"
                    className="text-sm font-semibold text-nd-text flex items-center gap-1.5"
                  >
                    <Sliders className="h-4 w-4 text-nd-accent" aria-hidden="true" /> Accessibility Mode
                  </label>
                  <Select
                    value={settings.accessibilityProfile}
                    onChange={(e) =>
                      updateSettings({ accessibilityProfile: e.target.value as AccessibilityProfile })
                    }
                    options={[
                      { value: "default", label: "Default (Standard Styling)" },
                      { value: "high_contrast", label: "High Contrast (AAA Black/Yellow)" },
                      { value: "low_vision", label: "Low Vision (Large text assets)" },
                      { value: "colorblind_safe", label: "Colorblind Safe (Blue/Orange tags)" },
                      { value: "reduced_motion", label: "Reduced Motion (Zero animations)" },
                      { value: "dyslexia_focus", label: "Dyslexia Focus (Warm sepia)" },
                    ]}
                  />
                </div>
              </div>

              {/* Import / Export Panel */}
              <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 flex flex-col gap-4">
                <h4 className="text-sm font-semibold text-nd-text">Import / Export Settings</h4>
                <div className="flex flex-col gap-2">
                  <Button variant="primary" size="sm" fullWidth onClick={handleExport}>
                    Generate Export JSON
                  </Button>
                  {exportStr && (
                    <textarea
                      readOnly
                      value={exportStr}
                      aria-label="Exported theme JSON"
                      className="w-full h-32 rounded-xl p-3 border border-nd-text-muted/15 bg-nd-surface font-mono text-xs text-nd-text-muted outline-none"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <textarea
                    placeholder="Paste Theme JSON configuration here..."
                    value={importStr}
                    onChange={(e) => setImportStr(e.target.value)}
                    aria-label="Import theme JSON"
                    className="w-full h-24 rounded-xl p-3 border border-nd-text-muted/15 bg-nd-surface font-mono text-xs text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 focus-visible:outline-none"
                  />
                  <Button variant="primary" size="sm" fullWidth onClick={handleImport}>
                    Apply Imported JSON
                  </Button>
                  {importMessage && (
                    <p
                      role="status"
                      aria-live="polite"
                      className={`text-xs ${importMessage.ok ? 'text-nd-success' : 'text-nd-danger'}`}
                    >
                      {importMessage.text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "diagnostics" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
                <h4 className="text-sm font-semibold text-nd-text flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-nd-accent" aria-hidden="true" /> Theme Engine Health
                </h4>
                <div className="mt-3 grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="rounded-lg bg-nd-surface/50 p-3">
                    <p className="text-nd-text-muted">Engine Status</p>
                    <p className="mt-1 text-nd-success font-semibold">{resolvedTokens ? "Active" : "Fallback"}</p>
                  </div>
                  <div className="rounded-lg bg-nd-surface/50 p-3">
                    <p className="text-nd-text-muted">Display Target</p>
                    <p className="mt-1 text-nd-accent font-semibold">{settings.displayProfile}</p>
                  </div>
                  <div className="rounded-lg bg-nd-surface/50 p-3">
                    <p className="text-nd-text-muted">Active Live Wallpaper</p>
                    <p className="mt-1 text-nd-text font-semibold">{settings.activeWallpaperId}</p>
                  </div>
                </div>
              </div>

              {/* Token Inspector Toggle */}
              <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 flex flex-col gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setShowTokenInspector(!showTokenInspector)}
                  icon={Eye}
                >
                  Active Token CSS Custom Properties
                </Button>
                {showTokenInspector && (
                  <div className="max-h-60 overflow-y-auto p-3 rounded-xl border border-nd-text-muted/10 bg-nd-surface/50 font-mono text-[11px] text-nd-text-secondary flex flex-col gap-1.5 scrollbar-thin">
                    <p>
                      <span className="text-nd-accent">--nd-bg</span>:{" "}
                      {resolvedTokens.color.surface.app}
                    </p>
                    <p>
                      <span className="text-nd-accent">--nd-surface</span>:{" "}
                      {resolvedTokens.color.surface.base}
                    </p>
                    <p>
                      <span className="text-nd-accent">--nd-accent</span>:{" "}
                      {resolvedTokens.color.accent.primary}
                    </p>
                    <p>
                      <span className="text-nd-accent">--nd-text</span>:{" "}
                      {resolvedTokens.color.text.primary}
                    </p>
                    <p>
                      <span className="text-nd-accent">--nd-text-muted</span>:{" "}
                      {resolvedTokens.color.text.muted}
                    </p>
                    <p>
                      <span className="text-nd-accent">--nd-glow</span>:{" "}
                      {resolvedTokens.color.accent.glow}
                    </p>
                    <p>
                      <span className="text-nd-accent">--font-body</span>:{" "}
                      {resolvedTokens.typography.fontFamily.ui}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Details Sidebar Panel (Right Column) */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-nd-text-muted/15 p-4 flex flex-col gap-4 bg-nd-surface/10 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-nd-accent" />
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-nd-text-muted">
              Active Setup
            </h4>
          </div>
          <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3 flex flex-col gap-1.5">
            <p className="text-[10px] text-nd-text-muted uppercase font-bold">Theme Name</p>
            <p className="text-sm font-semibold text-nd-text">{activeTheme.name}</p>
          </div>

          <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3 flex flex-col gap-1.5">
            <p className="text-[10px] text-nd-text-muted uppercase font-bold">
              Display Calibration
            </p>
            <p className="text-xs text-nd-text-secondary leading-relaxed">
              {settings.displayProfile === "steamdeck_lcd"
                ? "LCD Mode: Enhanced contrast and luminance settings active."
                : settings.displayProfile === "steamdeck_oled"
                  ? "OLED Mode: True black mapping active to optimize screen efficiency."
                  : "Standard desktop scaling applied."}
            </p>
          </div>

          <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3 flex flex-col gap-1.5">
            <p className="text-[10px] text-nd-text-muted uppercase font-bold">Motion Easing</p>
            <p className="text-xs text-nd-text-secondary leading-relaxed">
              {settings.accessibilityProfile === "reduced_motion"
                ? "Reduced Motion: Live canvas wallpaper paused, UI transitions set to instant."
                : "Smooth animations enabled."}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
