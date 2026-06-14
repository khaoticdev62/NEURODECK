import { useMemo } from 'react';
import { Panel } from '../../primitives/Panel';
import { Select } from '../../primitives/Select';
import { Toggle } from '../../primitives/Toggle';
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
  const themeOptions = useMemo(
    () => availableThemes.map((t) => ({ value: t.id, label: t.name })),
    [availableThemes],
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--nd-text-primary)]">Preferences & Styling</h2>
        <p className="text-xs text-[var(--nd-text-muted)]">Personalize your workspace aesthetics and layout scaling.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Theme Select */}
        <div className="space-y-3">
          <Select
            label="Default Theme Preset"
            value={themeId}
            options={themeOptions}
            onChange={(e) => onThemeChange(e.target.value)}
            hint="Supports all synced 30+ premium, core, and accessibility themes."
            fullWidth
          />

          <div className="flex flex-wrap gap-2">
            {availableThemes.map((t) => {
              const active = t.id === themeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onThemeChange(t.id)}
                  aria-pressed={active}
                  className={`nd-focus-ring flex items-center gap-2 rounded-[var(--nd-radius-md)] border px-2.5 py-1.5 text-xs transition motion-reduce:transition-none ${
                    active
                      ? 'border-[rgba(var(--nd-cyan-rgb),0.4)] bg-[var(--nd-accent-soft)] text-[var(--nd-accent-primary)]'
                      : 'border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)] text-[var(--nd-text-secondary)] hover:bg-[var(--nd-surface-hover)]'
                  }`}
                  title={t.description}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-[var(--nd-border-subtle)]"
                    style={{ backgroundColor: t.tokens?.color?.accent?.primary ?? 'var(--nd-accent-primary)' }}
                    aria-hidden="true"
                  />
                  <span className="truncate max-w-[8rem]">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Scale Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-[var(--nd-tracking-hud)] text-[var(--nd-text-muted)]">Text Font Scale</label>
            <span className="font-mono text-xs text-[var(--nd-accent-primary)]">{fontScale}%</span>
          </div>
          <input
            type="range"
            min={80}
            max={120}
            step={5}
            value={fontScale}
            onChange={(e) => onFontScaleChange(Number(e.target.value))}
            className="w-full accent-[var(--nd-accent-primary)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--nd-text-muted)]">
            <span>80%</span>
            <span>100%</span>
            <span>120%</span>
          </div>
        </div>

        {/* Layout Toggles */}
        <Panel variant="surface" className="md:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--nd-text-primary)]">Compact Density Layout</p>
                <p className="text-xs text-[var(--nd-text-muted)]">Reduce element spacing and padding. Recommended for Steam Deck.</p>
              </div>
              <Toggle
                checked={compactMode}
                onChange={onCompactModeToggle}
                label="Compact Density Layout"
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-[var(--nd-border-subtle)] pt-3">
              <div>
                <p className="text-sm font-medium text-[var(--nd-text-primary)]">Reduced Motion Effects</p>
                <p className="text-xs text-[var(--nd-text-muted)]">Disable background shaders, particles, and fast slide animations.</p>
              </div>
              <Toggle
                checked={reducedMotion}
                onChange={onReducedMotionToggle}
                label="Reduced Motion Effects"
              />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
