import { ControllerButton } from '../../components/primitives/ControllerButton'
import { NdxEditorShell, NdxSettingsTree, NdxToolWindow } from '../../components/workbench'
import { usePresentationMode } from '../../state/usePresentationMode'

/**
 * Epic X14 Presentation Mode (supplemental spec §46.1) toggle screen.
 * See `PresentationModeProvider`'s doc comment for exactly which real
 * mechanisms this reuses (text scale, toast muting, keep-awake) and
 * `usePresentationMode`'s consumers (e.g. the Secrets Vault) for what
 * gets gated while active.
 */
export function PresentationModeSettingsScreen(): React.JSX.Element {
  const { enabled, keepScreenAwake, setPresentationMode } = usePresentationMode()

  return (
    <div className="grid h-full grid-cols-1 gap-2 overflow-auto docked:min-w-[76rem] docked:grid-cols-[16rem_minmax(40rem,1fr)_18rem]">
      <NdxSettingsTree>
        <div className="space-y-2 text-meta text-text-secondary">
          <p className="text-text-primary">Presentation</p>
          <p>Visibility</p>
          <p>Power</p>
        </div>
      </NdxSettingsTree>

      <NdxEditorShell title="Presentation Preferences">
        <div className="flex min-h-full min-w-0 flex-col gap-4 p-4">
          <p className="text-title font-semibold text-text-primary">Presentation Mode</p>
          <p className="text-meta text-text-secondary">
            Hides secrets, uses larger text, suppresses low-priority notifications, and can keep the
            screen awake — useful when presenting or screen-sharing. Security-critical notifications
            and errors always stay visible.
          </p>

          <section className="flex flex-col gap-3 ndx-settings-section">
            <div className="flex items-center justify-between">
              <p className="text-meta font-semibold text-text-primary">Presentation Mode</p>
              <ControllerButton
                variant={enabled ? 'primary' : 'secondary'}
                onClick={() => setPresentationMode(!enabled, keepScreenAwake)}
              >
                {enabled ? 'On' : 'Off'}
              </ControllerButton>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-meta text-text-secondary">Keep screen awake while active</p>
              <ControllerButton
                variant={keepScreenAwake ? 'primary' : 'secondary'}
                onClick={() => setPresentationMode(enabled, !keepScreenAwake)}
              >
                {keepScreenAwake ? 'On' : 'Off'}
              </ControllerButton>
            </div>
          </section>
        </div>
      </NdxEditorShell>

      <NdxToolWindow
        title="Presentation Policy"
        subtitle={enabled ? 'Active' : 'Inactive'}
        side="right"
      >
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Vault reveal actions and mutable low-priority notifications honor this mode.</p>
          <p>Security-critical notifications and errors remain visible.</p>
        </div>
      </NdxToolWindow>
    </div>
  )
}
