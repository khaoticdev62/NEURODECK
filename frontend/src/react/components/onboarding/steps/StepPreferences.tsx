import { CheckCircle2, Circle } from 'lucide-react';
import type { NeurodeckTheme } from '../../../../shared/theme/themeContracts';

interface StepPreferencesProps {
  availableThemes: NeurodeckTheme[];
  themeId: string;
  fontScale: number;
  compactMode: boolean;
  reducedMotion: boolean;
  onThemeChange: (id: string) => void;
  onFontScaleChange: (scale: number) => void;
  onCompactModeToggle: () => void;
  onReducedMotionToggle: () => void;
}

export function StepPreferences({
  availableThemes,
  themeId,
  fontScale,
  compactMode,
  reducedMotion,
  onThemeChange,
  onFontScaleChange,
  onCompactModeToggle,
  onReducedMotionToggle,
}: StepPreferencesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-nd-text">Preferences &amp; Styling</h2>
        <p className="text-xs text-nd-text-muted">Personalize your workspace aesthetics and layout scaling.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Theme Select */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-nd-text">Default Theme Preset</label>
          <select
            value={themeId}
            onChange={(e) => onThemeChange(e.target.value)}
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
            onChange={(e) => onFontScaleChange(Number(e.target.value))}
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
              onClick={onCompactModeToggle}
              aria-label={compactMode ? 'Disable compact density layout' : 'Enable compact density layout'}
              aria-pressed={compactMode}
              className="text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded"
            >
              {compactMode
                ? <CheckCircle2 className="h-5 w-5 text-nd-success" aria-hidden="true" />
                : <Circle className="h-5 w-5 text-nd-text-muted" aria-hidden="true" />}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-nd-text-muted/10 pt-3">
            <div>
              <p className="text-xs font-semibold text-nd-text">Reduced Motion Effects</p>
              <p className="text-[10px] text-nd-text-muted">Disable background shaders, particles, and fast slide animations.</p>
            </div>
            <button
              type="button"
              onClick={onReducedMotionToggle}
              aria-label={reducedMotion ? 'Disable reduced motion effects' : 'Enable reduced motion effects'}
              aria-pressed={reducedMotion}
              className="text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded"
            >
              {reducedMotion
                ? <CheckCircle2 className="h-5 w-5 text-nd-success" aria-hidden="true" />
                : <Circle className="h-5 w-5 text-nd-text-muted" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
