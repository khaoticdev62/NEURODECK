import { useState } from 'react'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import { quitApp, restartApp } from '../../services/ipc/powerClient'
import { useLockState } from '../../state/useLockState'

type PendingAction = 'restart' | 'quit' | null

interface DeferredOption {
  label: string
  reason: string
}

const DEFERRED_OPTIONS: DeferredOption[] = [
  { label: 'Suspend', reason: 'Real OS suspend needs a native integration not built yet.' },
  {
    label: 'Restart core service',
    reason:
      'This architecture has no separate core-service process to restart independently of the app.'
  },
  {
    label: 'Restart device',
    reason:
      'A real OS reboot is irreversible against the whole machine, not just this app — needs its own native integration and explicit design before being wired.'
  },
  {
    label: 'Shut down',
    reason:
      'A real OS shutdown is irreversible against the whole machine, not just this app — needs its own native integration and explicit design before being wired.'
  }
]

/**
 * ND-051 Power Menu, scoped to the two actions that are genuinely safe to
 * automate with a real Electron API: relaunching or quitting this app.
 * "Return to SteamOS" is the same real quit action under a SteamOS-specific
 * label, not a separate code path. Suspend/restart-device/shutdown are
 * irreversible actions against the whole host machine (not just this app)
 * — deliberately not wired without a dedicated native-integration design
 * and explicit sign-off; see the ledger for the full reasoning.
 */
export function PowerMenu(): React.JSX.Element {
  const [pending, setPending] = useState<PendingAction>(null)
  const { pinConfigured, lock } = useLockState()

  async function handleConfirm(): Promise<void> {
    if (pending === 'restart') await restartApp()
    else if (pending === 'quit') await quitApp()
    setPending(null)
  }

  return (
    <div className="grid h-full min-w-[64rem] grid-cols-[minmax(40rem,1fr)_20rem] gap-2 overflow-auto">
      <NdxEditorShell title="Power Actions">
        <div className="flex min-h-full min-w-0 flex-col gap-4 p-4">
          <p className="text-title font-semibold text-text-primary">Power Menu</p>

          <ul className="flex flex-col gap-2">
            <PowerOption label="Restart NeuroDeck" onActivate={() => setPending('restart')} />
            <PowerOption
              label="Quit NeuroDeck / Return to SteamOS"
              onActivate={() => setPending('quit')}
            />
            {pinConfigured ? (
              <PowerOption label="Lock NeuroDeck" onActivate={lock} />
            ) : (
              <li className="border border-border bg-surface p-3 opacity-60">
                <p className="text-body font-semibold text-text-primary">Lock NeuroDeck</p>
                <p className="text-meta text-text-tertiary">
                  Not available: set a PIN in Privacy and Permissions first.
                </p>
              </li>
            )}
            {DEFERRED_OPTIONS.map((option) => (
              <li key={option.label} className="border border-border bg-surface p-3 opacity-60">
                <p className="text-body font-semibold text-text-primary">{option.label}</p>
                <p className="text-meta text-text-tertiary">Not available: {option.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      </NdxEditorShell>

      <NdxToolWindow
        title="Host Safety"
        subtitle={pinConfigured ? 'Lock enabled' : 'PIN missing'}
        side="right"
      >
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Only app restart, app quit, and PIN-backed lock are wired.</p>
          <p>Host suspend, reboot, and shutdown remain unavailable without native integration.</p>
        </div>
      </NdxToolWindow>

      <ConfirmationDialog
        open={pending !== null}
        title="Power action"
        action={pending === 'restart' ? 'Restart NeuroDeck' : 'Quit NeuroDeck'}
        consequence="Any unsaved in-progress work in open editors will be lost; persisted data (workspaces, recovery checkpoints, workflows, agents) is unaffected."
        confirmLabel={pending === 'restart' ? 'Restart' : 'Quit'}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}

function PowerOption({
  label,
  onActivate
}: {
  label: string
  onActivate: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLLIElement>({
    id: `power-option:${label}`,
    groupId: 'power-menu',
    onActivate
  })

  return (
    <li
      ref={ref}
      tabIndex={-1}
      className={`border p-3 ${isFocused ? 'border-border-focus' : 'border-border'} bg-surface`}
    >
      <div className="flex items-center justify-between">
        <p className="text-body font-semibold text-text-primary">{label}</p>
        <ControllerButton variant="primary" onClick={onActivate}>
          Select
        </ControllerButton>
      </div>
    </li>
  )
}
