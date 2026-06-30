import type { TextScale } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { NdxEditorShell, NdxSettingsTree, NdxToolWindow } from '../../components/workbench'
import { useDisplaySettings } from '../../state/useDisplaySettings'

const TEXT_SCALES: TextScale[] = ['normal', 'large', 'larger']

interface DeferredSection {
  title: string
  reason: string
}

const DEFERRED_SECTIONS: DeferredSection[] = [
  {
    title: 'Appearance',
    reason: 'No light theme exists yet — this is a single, fixed dark theme.'
  },
  { title: 'Transparency', reason: 'No glass/blur visual effects exist yet to toggle.' },
  {
    title: 'Focus style',
    reason: 'No alternate focus-ring style exists yet — only the current ring/bloom.'
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
 * ND-044 Display and Theme Settings, scoped to the three real overrides
 * this single-theme dark UI can support without inventing a visual system
 * that doesn't exist: a forced reduce-motion override (independent of the
 * OS `prefers-reduced-motion` media query `tokens.css` already honors), a
 * forced high-contrast override (same relationship to `prefers-contrast:
 * more`), and a real text-size scale applied via the `--ndx-text-scale`
 * custom property the whole type scale already multiplies by.
 */
export function DisplayThemeSettings(): React.JSX.Element {
  const { reduceMotion, highContrast, textScale, setReduceMotion, setHighContrast, setTextScale } =
    useDisplaySettings()

  return (
    <div className="grid h-full min-w-[76rem] grid-cols-[16rem_minmax(40rem,1fr)_18rem] gap-2 overflow-auto">
      <NdxSettingsTree>
        <div className="space-y-2 text-meta text-text-secondary">
          <p className="text-text-primary">Display</p>
          <p>Motion</p>
          <p>Contrast</p>
          <p>Text size</p>
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

          {DEFERRED_SECTIONS.map((section) => (
            <section key={section.title} className="border border-border bg-surface p-3 opacity-60">
              <p className="text-body font-semibold text-text-primary">{section.title}</p>
              <p className="text-meta text-text-tertiary">Not available: {section.reason}</p>
            </section>
          ))}
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Theme Scope" subtitle={textScale} side="right">
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Existing reduced motion, high contrast, and text scale attributes remain intact.</p>
          <p>Wallpaper, light theme, and OLED-specific modes need a separate visual system.</p>
        </div>
      </NdxToolWindow>
    </div>
  )
}
