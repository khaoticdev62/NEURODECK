import { useNavigate } from 'react-router-dom'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxSpatialLockup } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import { useWorkspaces } from './useWorkspaces'

/**
 * ND-018 Workspace Hub. Real: every card is a workspace actually persisted
 * by the `WorkspaceStore` (Epic 5's real IPC layer). "Add workspace" opens
 * a genuine native folder picker. Branch/health/last-opened fields from the
 * spec's card layout wait for Git (Epic 6) and task/session state
 * (Epic 8) — only name, root path, and created date are real today.
 */
export function WorkspaceHub(): React.JSX.Element {
  const { workspaces, loading, error, addFromPicker, remove, setActive } = useWorkspaces()
  const navigate = useNavigate()

  const { ref: addRef } = useFocusable<HTMLButtonElement>({
    id: 'workspace-hub:add',
    groupId: 'workspace-hub',
    priority: 1,
    initialFocus: true,
    onActivate: () => void addFromPicker()
  })

  if (loading) {
    return <p className="p-4 text-meta text-text-secondary">Loading workspaces…</p>
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-title font-semibold text-text-primary">Workspaces</p>
        <ControllerButton ref={addRef} variant="primary" onClick={() => void addFromPicker()}>
          Add workspace
        </ControllerButton>
      </div>

      {error && <ErrorState title="Something went wrong" description={error} />}

      {workspaces.length === 0 ? (
        <EmptyState
          className="flex-1"
          title="No workspaces yet"
          description="Add a folder to get started — NeuroDeck will remember it for next time."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              id={workspace.id}
              name={workspace.name}
              rootPath={workspace.rootPath}
              createdAt={workspace.createdAt}
              onOpen={() => {
                setActive(workspace.id)
                navigate('/workspaces/detail')
              }}
              onRemove={() => void remove(workspace.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function WorkspaceCard({
  id,
  name,
  rootPath,
  createdAt,
  onOpen,
  onRemove
}: {
  id: string
  name: string
  rootPath: string
  createdAt: number
  onOpen: () => void
  onRemove: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLLIElement>({
    id: `workspace-card:${id}`,
    groupId: 'workspace-hub',
    onActivate: onOpen
  })

  return (
    <li ref={ref} tabIndex={-1}>
      <NdxSpatialLockup selected={isFocused}>
        <section className="flex min-h-40 flex-col">
          <p className="text-body font-semibold text-text-primary">{name}</p>
          <p className="break-all text-meta text-text-secondary">{rootPath}</p>
          <p className="text-meta text-text-tertiary">
            Added {new Date(createdAt).toLocaleDateString()}
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-3">
            <ControllerButton variant="primary" onClick={onOpen}>
              Open
            </ControllerButton>
            <ControllerButton variant="ghost" onClick={onRemove}>
              Remove
            </ControllerButton>
          </div>
        </section>
      </NdxSpatialLockup>
    </li>
  )
}
