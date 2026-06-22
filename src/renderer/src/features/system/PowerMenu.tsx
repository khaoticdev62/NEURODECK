import { useState } from 'react'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { useFocusable } from '../../controller/focus/useFocusable'
import { quitApp, restartApp } from '../../services/ipc/powerClient'

type PendingAction = 'restart' | 'quit' | null

interface DeferredOption {
  label: string
  reason: string
}

const DEFERRED_OPTIONS: DeferredOption[] = [
  { label: 'Lock NeuroDeck', reason: 'Needs the Lock Screen (ND-002), not built yet.' },
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

  async function handleConfirm(): Promise<void> {
    if (pending === 'restart') await restartApp()
    else if (pending === 'quit') await quitApp()
    setPending(null)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <p className="text-title font-semibold text-text-primary">Power Menu</p>

      <ul className="flex flex-col gap-2">
        <PowerOption label="Restart NeuroDeck" onActivate={() => setPending('restart')} />
        <PowerOption
          label="Quit NeuroDeck / Return to SteamOS"
          onActivate={() => setPending('quit')}
        />
        {DEFERRED_OPTIONS.map((option) => (
          <li key={option.label} className="border border-border bg-surface p-3 opacity-60">
            <p className="text-body font-semibold text-text-primary">{option.label}</p>
            <p className="text-meta text-text-tertiary">Not available: {option.reason}</p>
          </li>
        ))}
      </ul>

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
