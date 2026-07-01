import type { Accent, Density, FocusStyle, RadiusStyle, TextScale } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { NdxEditorShell, NdxSettingsTree, NdxToolWindow } from '../../components/workbench'
import { useDisplaySettings } from '../../state/useDisplaySettings'

const TEXT_SCALES: TextScale[] = ['normal', 'large', 'larger']

const ACCENTS: { value: Accent; label: string; swatch: string }[] = [
  { value: 'cyan', label: 'Cyan', swatch: '#78dce8' },
  { value: 'violet', label: 'Violet', swatch: '#a78bfa' },
  { value: 'amber', label: 'Amber', swatch: '#f4c95d' },
  { value: 'green', label: 'Green', swatch: '#58d68d' },
  { value: 'rose', label: 'Rose', swatch: '#ff6b7a' }
]

const RADIUS_STYLES: RadiusStyle[] = ['sharp', 'soft', 'round']
const DENSITIES: Density[] = ['compact', 'comfortable', 'spacious']
const FOCUS_STYLES: FocusStyle[] = ['ring', 'bloom', 'underline']

interface DeferredSection {
  title: string
  reason: string
}

const DEFERRED_SECTIONS: DeferredSection[] = [
  {
    title: 'Appearance',
    reason: 'No light theme exists yet — accent/radius/density/surface/focus style are real, but the base is still a single, fixed dark theme.'
  },
  { title: 'Wallpaper', reason: 'No wallpaper system exists yet.' },
  {
    title: 'Live wallpaper performance',
    reason: 'Depends on a wallpaper system that doesn’t exist yet.'
  },
  {
    title: 'OLED-safe behavior',
    reason: 'The current theme is already near-black; a dedicated OLED mode is not built.'
  }
]

/**
 * ND-044 Display and Theme Settings: the original three overrides (forced
 * reduce-motion, forced high-contrast, text-scale) plus a structured theme
 * builder — accent color, corner radius, spacing density, surface style,
 * and focus-indicator style — each patching the `--ndx-*`/`--color-*` token
 * layer in tokens.css via a `data-ndx-*` attribute on the workbench root.
 */
export function DisplayThemeSettings(): React.JSX.Element {
  const {
    reduceMotion,
    highContrast,
    textScale,
    accent,
    radiusStyle,
    density,
    surfaceStyle,
    focusStyle,
    setReduceMotion,
    setHighContrast,
    setTextScale,
    setAccent,
    setRadiusStyle,
    setDensity,
    setSurfaceStyle,
    setFocusStyle
  } = useDisplaySettings()
  const glassDisabled = highContrast

  return (
    <div className="grid h-full min-w-[76rem] grid-cols-[16rem_minmax(40rem,1fr)_18rem] gap-2 overflow-auto">
      <NdxSettingsTree>
        <div className="space-y-2 text-meta text-text-secondary">
          <p className="text-text-primary">Display</p>
          <p>Motion</p>
          <p>Contrast</p>
          <p>Text size</p>
          <p>Accent color</p>
          <p>Corner style</p>
          <p>Density</p>
          <p>Surface style</p>
          <p>Focus style</p>
          <p>Deferred visuals</p>
        </div>
      </NdxSettingsTree>

      <NdxEditorShell title="Display Preferences">
        <div className="flex min-h-full min-w-0 flex-col gap-4 overflow-auto p-4">
          <p className="text-title font-semibold text-text-primary">Display and Theme Settings</p>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Motion</p>
            <p className="text-meta text-text-tertiary">
              The OS-level &quot;reduce motion&quot; preference is already honored automatically.
              This forces it on regardless of that preference.
            </p>
            <ControllerButton
              variant={reduceMotion ? 'primary' : 'secondary'}
              onClick={() => setReduceMotion(!reduceMotion)}
            >
              {reduceMotion ? 'Reduce motion: on' : 'Reduce motion: off'}
            </ControllerButton>
          </section>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Contrast</p>
            <p className="text-meta text-text-tertiary">
              The OS-level &quot;increase contrast&quot; preference is already honored
              automatically. This forces it on regardless of that preference.
            </p>
            <ControllerButton
              variant={highContrast ? 'primary' : 'secondary'}
              onClick={() => setHighContrast(!highContrast)}
            >
              {highContrast ? 'High contrast: on' : 'High contrast: off'}
            </ControllerButton>
          </section>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Text size</p>
            <div className="flex gap-2">
              {TEXT_SCALES.map((scale) => (
                <ControllerButton
                  key={scale}
                  variant={textScale === scale ? 'primary' : 'secondary'}
                  onClick={() => setTextScale(scale)}
                >
                  {scale}
                </ControllerButton>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Accent color</p>
            <p className="text-meta text-text-tertiary">
              Colors focus rings, selected rows, and active controls throughout the workbench.
            </p>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((option) => (
                <ControllerButton
                  key={option.value}
                  variant={accent === option.value ? 'primary' : 'secondary'}
                  onClick={() => setAccent(option.value)}
                  className="items-center gap-2"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 rounded-full border border-border-strong"
                    style={{ backgroundColor: option.swatch }}
                  />
                  {option.label}
                </ControllerButton>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Corner style</p>
            <div className="flex gap-2">
              {RADIUS_STYLES.map((style) => (
                <ControllerButton
                  key={style}
                  variant={radiusStyle === style ? 'primary' : 'secondary'}
                  onClick={() => setRadiusStyle(style)}
                >
                  {style}
                </ControllerButton>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Density</p>
            <p className="text-meta text-text-tertiary">
              Adjusts spacing and list row height. Button and touch-target sizes stay fixed to keep
              every control at least 48px, regardless of density.
            </p>
            <div className="flex gap-2">
              {DENSITIES.map((option) => (
                <ControllerButton
                  key={option}
                  variant={density === option ? 'primary' : 'secondary'}
                  onClick={() => setDensity(option)}
                >
                  {option}
                </ControllerButton>
              ))}
            </div>
          </section>

          <section
            className={`flex flex-col gap-2 border border-border bg-surface p-3 ${glassDisabled ? 'opacity-60' : ''}`}
          >
            <p className="text-body font-semibold text-text-primary">Surface style</p>
            <p className="text-meta text-text-tertiary">
              {glassDisabled
                ? 'Forced to solid while high contrast is on — a transparent/blurred surface would undermine the extra separation high contrast provides.'
                : 'Glass adds a blurred, translucent background to panels and tool windows.'}
            </p>
            <div className="flex gap-2">
              <ControllerButton
                variant={surfaceStyle === 'solid' ? 'primary' : 'secondary'}
                onClick={() => setSurfaceStyle('solid')}
              >
                solid
              </ControllerButton>
              <ControllerButton
                variant={surfaceStyle === 'glass' ? 'primary' : 'secondary'}
                disabled={glassDisabled}
                onClick={() => setSurfaceStyle('glass')}
              >
                glass
              </ControllerButton>
            </div>
          </section>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Focus style</p>
            <div className="flex gap-2">
              {FOCUS_STYLES.map((style) => (
                <ControllerButton
                  key={style}
                  variant={focusStyle === style ? 'primary' : 'secondary'}
                  onClick={() => setFocusStyle(style)}
                >
                  {style}
                </ControllerButton>
              ))}
            </div>
          </section>

          {DEFERRED_SECTIONS.map((section) => (
            <section key={section.title} className="border border-border bg-surface p-3 opacity-60">
              <p className="text-body font-semibold text-text-primary">{section.title}</p>
              <p className="text-meta text-text-tertiary">Not available: {section.reason}</p>
            </section>
          ))}
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Theme Preview" subtitle={textScale} side="right">
        <div className="space-y-3 text-meta text-text-secondary">
          <div className="flex items-center gap-2 border border-border bg-surface p-2">
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 rounded-full border border-border-strong"
              style={{ backgroundColor: ACCENTS.find((option) => option.value === accent)?.swatch }}
            />
            <p className="text-text-primary">{ACCENTS.find((option) => option.value === accent)?.label}</p>
          </div>
          <p>
            Corners: <span className="text-text-primary">{radiusStyle}</span>
          </p>
          <p>
            Density: <span className="text-text-primary">{density}</span>
          </p>
          <p>
            Surface: <span className="text-text-primary">{surfaceStyle}</span>
          </p>
          <p>
            Focus style: <span className="text-text-primary">{focusStyle}</span>
          </p>
          <p>Wallpaper, light theme, and OLED-specific modes need a separate visual system.</p>
        </div>
      </NdxToolWindow>
    </div>
  )
}
