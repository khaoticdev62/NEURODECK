import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'
import { useFocusable } from '../../controller/focus/useFocusable'
import { useActionQueueRecords } from '../../ai-safety/useActionQueueRecords'

interface QuickAction {
  id: string
  label: string
  note?: string
  onActivate: () => void
  disabled?: boolean
}

function QuickAccessRow({
  action,
  index
}: {
  action: QuickAction
  index: number
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `quick-access:${action.id}`,
    groupId: 'quick-access',
    priority: index === 0 ? 1 : 0,
    initialFocus: index === 0,
    onActivate: action.onActivate
  })

  return (
    <ControllerButton
      ref={ref}
      variant="secondary"
      disabled={action.disabled}
      className={`justify-start text-left ${isFocused ? 'ring-2 ring-border-focus' : ''}`}
      onClick={action.onActivate}
    >
      <span className="flex flex-col items-start">
        <span className="text-body font-medium">{action.label}</span>
        {action.note && <span className="text-meta text-text-secondary">{action.note}</span>}
      </span>
    </ControllerButton>
  )
}

/**
 * ND-050 Quick Access Overlay. The Steam Deck Quick Access button is not
 * exposed by the standard Gamepad API, so this uses an honest fallback chord
 * (Menu + Y) and a keyboard key (O). It provides quick launcher actions
 * without destroying the underlying screen state.
 */
export function QuickAccessOverlay(): React.JSX.Element {
  const navigate = useNavigate()
  const { registry, subscribe } = useFocusEngine()
  const [open, setOpen] = useState(false)
  const records = useActionQueueRecords()

  const pendingApprovals = records.filter((r) => r.status === 'pending-approval').length
  const activeTasks = records.filter((r) => r.status === 'running' || r.status === 'queued').length

  useEffect(() => subscribe('quick.access', () => setOpen((current) => !current)), [subscribe])

  useEffect(() => {
    if (!open) return
    const unsubscribe = subscribe('back', () => setOpen(false))
    return () => unsubscribe()
  }, [open, subscribe])

  useEffect(() => {
    if (!open) return
    registry.pushTrap(['quick-access'])
    return () => registry.popTrap()
  }, [open, registry])

  function closeAnd(run: () => void): void {
    setOpen(false)
    run()
  }

  const sections: { title: string; actions: QuickAction[] }[] = [
    {
      title: 'AI',
      actions: [
        {
          id: 'ai-ask',
          label: 'Ask about current screen',
          note: 'Open the AI Command Canvas',
          onActivate: () => closeAnd(() => navigate('/ai'))
        },
        {
          id: 'ai-continue',
          label: 'Continue last task',
          note: 'Not implemented yet',
          disabled: true,
          onActivate: () => undefined
        },
        {
          id: 'ai-pause',
          label: 'Pause agents',
          note: 'Per-agent pause is available on the agent detail screen',
          disabled: true,
          onActivate: () => undefined
        }
      ]
    },
    {
      title: 'Workspace',
      actions: [
        {
          id: 'workspace-switch',
          label: 'Switch workspace',
          note: 'Open the Workspace Hub',
          onActivate: () => closeAnd(() => navigate('/workspaces'))
        },
        {
          id: 'workspace-save',
          label: 'Save state',
          note: 'Global state snapshots are not implemented yet',
          disabled: true,
          onActivate: () => undefined
        },
        {
          id: 'workspace-terminal',
          label: 'Open terminal',
          onActivate: () => closeAnd(() => navigate('/terminal'))
        }
      ]
    },
    {
      title: 'System',
      actions: [
        {
          id: 'system-performance',
          label: 'Performance profile',
          note: 'Performance profiles are not implemented yet',
          disabled: true,
          onActivate: () => undefined
        },
        {
          id: 'system-model',
          label: 'Model profile',
          note: 'Open routing profiles',
          onActivate: () => closeAnd(() => navigate('/models/routing-profiles'))
        },
        {
          id: 'system-vpn',
          label: 'VPN',
          note: 'Open network and VPN settings',
          onActivate: () => closeAnd(() => navigate('/settings/network'))
        }
      ]
    }
  ]

  if (!open) return <></>

  return (
    <div
      className="fixed inset-0 z-[var(--ndx-z-overlay)] flex justify-end bg-overlay/60"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false)
      }}
    >
      <div
        role="dialog"
        aria-label="Quick Access"
        className="flex h-full w-full max-w-md flex-col gap-4 border-l border-border bg-surface p-4 shadow-elevated transition-transform duration-150 ease-out"
        data-reduce-motion="true"
      >
        <div className="flex items-center justify-between">
          <p className="text-title font-semibold text-text-primary">NeuroDeck</p>
          <ControllerButton variant="ghost" onClick={() => setOpen(false)}>
            Close
          </ControllerButton>
        </div>

        <div className="flex flex-col gap-4 overflow-auto">
          {sections.map((section) => (
            <section key={section.title}>
              <p className="mb-1 text-meta font-semibold text-text-primary">{section.title}</p>
              <div className="flex flex-col gap-1">
                {section.actions.map((action, index) => (
                  <QuickAccessRow key={action.id} action={action} index={index} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-auto border-t border-border pt-2 text-meta text-text-secondary">
          {activeTasks > 0 || pendingApprovals > 0 ? (
            <span>
              {activeTasks} active {activeTasks === 1 ? 'task' : 'tasks'} · {pendingApprovals}{' '}
              pending {pendingApprovals === 1 ? 'approval' : 'approvals'}
            </span>
          ) : (
            <span>No active tasks or approvals</span>
          )}
        </div>
      </div>
    </div>
  )
}
