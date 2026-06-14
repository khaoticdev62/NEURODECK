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

import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { MetricCard } from "../../components/primitives/MetricCard";
import { Panel } from "../../components/primitives/Panel";
import { Select } from "../../components/primitives/Select";

import { TabGroup, TabList, Tab, TabPanels, TabPanel } from "../../components/primitives/Tabs";
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

const TABS = ["themes", "wallpapers", "settings", "diagnostics"] as const;

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

  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("themes");
  const [showTokenInspector, setShowTokenInspector] = useState(false);
  const [exportStr, setExportStr] = useState("");
  const [importStr, setImportStr] = useState("");
  const [importMessage, setImportMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handleExport = () => {
    setExportStr(JSON.stringify(settings, null, 2));
  };

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
      className="flex h-full flex-col overflow-hidden"
      action={
        <IconButton
          aria-label="Reset settings to defaults"
          variant="outline"
          size="md"
          onClick={resetToDefaults}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      }
    >
      <TabGroup value={activeTab} onChange={(v) => setActiveTab(v as typeof TABS[number])} className="flex h-full flex-col">
        <div className="border-b border-border-subtle bg-surface-secondary/30 px-4 py-2">
          <TabList aria-label="Theme settings sections">
            {TABS.map((tab) => (
              <Tab key={tab} value={tab}>
                {tab}
              </Tab>
            ))}
          </TabList>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <TabPanels className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            <TabPanel value="themes">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {availableThemes.map((theme) => {
                  const active = settings.activeThemeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      aria-pressed={active}
                      aria-label={`${theme.name}${active ? " (active)" : ""}`}
                      onClick={() => updateSettings({ activeThemeId: theme.id })}
                      className={`group relative rounded-2xl border p-4 text-left transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
                        active
                          ? "border-accent-primary/50 bg-accent-primary/[0.07] shadow-glow-sm"
                          : "border-border-subtle bg-surface-secondary/40 hover:border-accent-primary/30 hover:bg-surface-tertiary/30"
                      }`}
                    >
                      {active && (
                        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent-primary text-surface-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </div>
                      )}

                      {/* Color Swatch Strip */}
                      <div className="mb-3 flex h-10 overflow-hidden rounded-lg border border-border-subtle">
                        <div className="flex-1" style={{ background: theme.tokens.color.surface.app }} />
                        <div className="flex-1" style={{ background: theme.tokens.color.surface.raised }} />
                        <div className="w-8" style={{ background: theme.tokens.color.accent.primary }} />
                        <div className="w-8" style={{ background: theme.tokens.color.text.primary }} />
                      </div>

                      <p className="text-sm font-semibold text-text-primary">{theme.name}</p>
                      <p className="mt-1 line-clamp-2 text-2xs leading-relaxed text-text-secondary">
                        {theme.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge tone="neutral" size="sm">
                          {theme.category}
                        </Badge>
                        {theme.steamDeck.oledTuned && (
                          <Badge tone="accent" size="sm">
                            OLED
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </TabPanel>

            <TabPanel value="wallpapers">
              <div className="flex flex-col gap-6">
                {/* Wallpaper settings inputs */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-text-primary">Live Wallpaper</label>
                      <Toggle
                        checked={settings.liveWallpaperEnabled}
                        onChange={() => updateSettings({ liveWallpaperEnabled: !settings.liveWallpaperEnabled })}
                        label="Toggle live wallpaper"
                      />
                    </div>
                    <p className="text-xs text-text-secondary">
                      Enable beautiful dynamic particles or CSS mesh gradients. Disabled on reduced motion.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="wall-opacity" className="text-sm font-semibold text-text-primary">
                        Background Opacity
                      </label>
                      <span className="text-xs font-semibold text-accent-primary">
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
                      className="h-1.5 w-full cursor-pointer rounded-lg bg-surface-primary accent-accent-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {/* None option */}
                  <button
                    type="button"
                    onClick={() => updateSettings({ activeWallpaperId: "none" })}
                    className={`flex flex-col overflow-hidden rounded-2xl border text-left transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
                      settings.activeWallpaperId === "none"
                        ? "border-accent-primary bg-accent-primary/[0.04] shadow-glow-sm"
                        : "border-border-subtle bg-surface-secondary/40 hover:border-accent-primary/30"
                    }`}
                  >
                    <div className="flex h-20 w-full items-center justify-center border-b border-border-subtle bg-black">
                      <Layers className="h-6 w-6 text-text-muted/50" />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-text-primary">Solid Black</p>
                      <p className="mt-1 text-2xs leading-normal text-text-secondary">
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
                        className={`flex flex-col overflow-hidden rounded-2xl border text-left transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
                          active
                            ? "border-accent-primary bg-accent-primary/[0.04] shadow-glow-sm"
                            : "border-border-subtle bg-surface-secondary/40 hover:border-accent-primary/30"
                        }`}
                      >
                        <div
                          className="h-20 w-full border-b border-border-subtle"
                          style={{
                            background: `linear-gradient(135deg, ${wp.visuals.basePalette[0]}22 0%, ${resolvedTokens.color.surface.app} 100%)`,
                          }}
                        />
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-text-primary">{wp.name}</p>
                            <Badge tone="accent" size="sm">
                              {wp.renderer}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-2xs leading-normal text-text-secondary">
                            {wp.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </TabPanel>

            <TabPanel value="settings">
              <div className="flex flex-col gap-6">
                {/* Display & Accessibility Selectors */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4">
                    <label
                      htmlFor="display-profile"
                      className="flex items-center gap-1.5 text-sm font-semibold text-text-primary"
                    >
                      <Monitor className="h-4 w-4 text-accent-primary" aria-hidden="true" /> Display Profile
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

                  <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4">
                    <label
                      htmlFor="accessibility-profile"
                      className="flex items-center gap-1.5 text-sm font-semibold text-text-primary"
                    >
                      <Sliders className="h-4 w-4 text-accent-primary" aria-hidden="true" /> Accessibility Mode
                    </label>
                    <Select
                      value={settings.accessibilityProfile}
                      onChange={(e) => updateSettings({ accessibilityProfile: e.target.value as AccessibilityProfile })}
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
                <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4">
                  <h4 className="text-sm font-semibold text-text-primary">Import / Export Settings</h4>
                  <div className="flex flex-col gap-2">
                    <Button variant="primary" size="sm" fullWidth onClick={handleExport}>
                      Generate Export JSON
                    </Button>
                    {exportStr && (
                      <textarea
                        readOnly
                        value={exportStr}
                        aria-label="Exported theme JSON"
                        className="h-32 w-full rounded-xl border border-border-subtle bg-surface-primary p-3 font-mono text-2xs text-text-secondary outline-none"
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <textarea
                      placeholder="Paste Theme JSON configuration here..."
                      value={importStr}
                      onChange={(e) => setImportStr(e.target.value)}
                      aria-label="Import theme JSON"
                      className="h-24 w-full rounded-xl border border-border-subtle bg-surface-primary p-3 font-mono text-2xs text-text-primary outline-none transition duration-fast focus:border-accent-primary/40 focus-visible:ring-2 focus-visible:ring-accent-primary/30"
                    />
                    <Button variant="primary" size="sm" fullWidth onClick={handleImport}>
                      Apply Imported JSON
                    </Button>
                    {importMessage && (
                      <p
                        role="status"
                        aria-live="polite"
                        className={`text-xs ${importMessage.ok ? "text-accent-success" : "text-accent-error"}`}
                      >
                        {importMessage.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </TabPanel>

            <TabPanel value="diagnostics">
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4">
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                    <ShieldAlert className="h-4 w-4 text-accent-primary" aria-hidden="true" /> Theme Engine Health
                  </h4>
                  <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-xs">
                    <MetricCard
                      label="Engine Status"
                      value={resolvedTokens ? "Active" : "Fallback"}
                      icon={CheckCircle2}
                      hint="Token resolution"
                    />
                    <MetricCard
                      label="Display Target"
                      value={settings.displayProfile}
                      icon={Monitor}
                      hint="Selected profile"
                    />
                    <MetricCard
                      label="Active Live Wallpaper"
                      value={settings.activeWallpaperId}
                      icon={Layers}
                      hint="Wallpaper ID"
                    />
                  </div>
                </div>

                {/* Token Inspector Toggle */}
                <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4">
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
                    <div className="flex max-h-60 flex-col gap-1.5 overflow-y-auto rounded-xl border border-border-subtle bg-surface-primary p-3 font-mono text-2xs text-text-secondary scrollbar-thin">
                      <p>
                        <span className="text-accent-primary">--nd-bg</span>: {resolvedTokens.color.surface.app}
                      </p>
                      <p>
                        <span className="text-accent-primary">--nd-surface</span>: {resolvedTokens.color.surface.base}
                      </p>
                      <p>
                        <span className="text-accent-primary">--nd-accent</span>: {resolvedTokens.color.accent.primary}
                      </p>
                      <p>
                        <span className="text-accent-primary">--nd-text</span>: {resolvedTokens.color.text.primary}
                      </p>
                      <p>
                        <span className="text-accent-primary">--nd-text-muted</span>: {resolvedTokens.color.text.muted}
                      </p>
                      <p>
                        <span className="text-accent-primary">--nd-glow</span>: {resolvedTokens.color.accent.glow}
                      </p>
                      <p>
                        <span className="text-accent-primary">--font-body</span>: {resolvedTokens.typography.fontFamily.ui}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabPanel>
          </TabPanels>

          {/* Details Sidebar Panel (Right Column) */}
          <div className="flex w-full shrink-0 flex-col gap-4 border-t border-border-subtle bg-surface-secondary/20 p-4 md:w-80 md:border-t-0 md:border-l">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-primary" aria-hidden="true" />
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Active Setup</h4>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-secondary/40 p-3">
              <p className="text-2xs font-bold uppercase text-text-muted">Theme Name</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{activeTheme.name}</p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-surface-secondary/40 p-3">
              <p className="text-2xs font-bold uppercase text-text-muted">Display Calibration</p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                {settings.displayProfile === "steamdeck_lcd"
                  ? "LCD Mode: Enhanced contrast and luminance settings active."
                  : settings.displayProfile === "steamdeck_oled"
                  ? "OLED Mode: True black mapping active to optimize screen efficiency."
                  : "Standard desktop scaling applied."}
              </p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-surface-secondary/40 p-3">
              <p className="text-2xs font-bold uppercase text-text-muted">Motion Easing</p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                {settings.accessibilityProfile === "reduced_motion"
                  ? "Reduced Motion: Live canvas wallpaper paused, UI transitions set to instant."
                  : "Smooth animations enabled."}
              </p>
            </div>
          </div>
        </div>
      </TabGroup>
    </Panel>
  );
}
