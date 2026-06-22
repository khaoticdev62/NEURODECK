import { useEffect, useState } from 'react'
import { Modal } from '../../components/overlays/Modal'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState } from '../../components/feedback/UXState'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'
import { useFocusable } from '../../controller/focus/useFocusable'
import { useWorkspaces } from './useWorkspaces'

/**
 * ND-020 Workspace Switcher, opened with the real `workspace.switcher`
 * action (LT+RT chord, wired in Epic 2). The spec's "live thumbnails" and
 * "resume most recent task" need session/UI-resume state that doesn't
 * exist yet (Epic 8) — this switches the real active workspace, which is
 * everything that currently has state to preserve.
 */
export function WorkspaceSwitcherOverlay(): React.JSX.Element {
  const { registry, subscribe } = useFocusEngine()
  const { workspaces, activeWorkspaceId, setActive } = useWorkspaces()
  const [open, setOpen] = useState(false)

  useEffect(
    () => subscribe('workspace.switcher', () => setOpen((current) => !current)),
    [subscribe]
  )

  useEffect(() => {
    if (!open) return
    registry.pushTrap(['workspace-switcher'])
    return () => registry.popTrap()
  }, [open, registry])

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Workspace Switcher">
      {workspaces.length === 0 ? (
        <EmptyState
          title="No workspaces yet"
          description="Add a workspace from the Workspace Hub first."
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto">
          {workspaces.map((workspace, index) => (
            <SwitcherCard
              key={workspace.id}
              id={workspace.id}
              name={workspace.name}
              priority={workspaces.length - index}
              active={workspace.id === activeWorkspaceId}
              onSwitch={() => {
                setActive(workspace.id)
                setOpen(false)
              }}
            />
          ))}
        </div>
      )}
    </Modal>
  )
}

function SwitcherCard({
  id,
  name,
  priority,
  active,
  onSwitch
}: {
  id: string
  name: string
  priority: number
  active: boolean
  onSwitch: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `workspace-switcher:${id}`,
    groupId: 'workspace-switcher',
    priority,
    onActivate: onSwitch
  })

  return (
    <ControllerButton
      ref={ref}
      variant={active ? 'primary' : 'secondary'}
      className={isFocused ? 'ring-2 ring-border-focus' : undefined}
      onClick={onSwitch}
    >
      {name}
    </ControllerButton>
  )
}
