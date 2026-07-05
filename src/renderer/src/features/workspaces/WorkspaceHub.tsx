import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitBranch } from 'lucide-react'
import type { GitStatus } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxSpatialLockup } from '../../components/workbench'
import { NdxTvShelf, TvCategoryIcon } from '../../components/tvos'
import { useFocusable } from '../../controller/focus/useFocusable'
import { getGitStatus } from '../../services/ipc/gitClient'
import { useWorkspaces } from './useWorkspaces'

/**
 * ND-018 Workspace Hub. Real: every card is a workspace actually persisted
 * by the `WorkspaceStore` (Epic 5's real IPC layer). "Add workspace" opens
 * a genuine native folder picker. Branch is now real too (`getGitStatus`,
 * Epic 6) — health/last-opened still wait for task/session state (Epic 8).
 */
export function WorkspaceHub(): React.JSX.Element {
  const { workspaces, loading, error, addFromPicker, remove, setActive } = useWorkspaces()
  const navigate = useNavigate()
  const [gitStatusByWorkspace, setGitStatusByWorkspace] = useState<Record<string, GitStatus>>({})

  useEffect(() => {
    let active = true
    void Promise.all(
      workspaces.map(async (workspace) => {
        const result = await getGitStatus({ workspaceId: workspace.id })
        return result.ok ? ([workspace.id, result.data] as const) : null
      })
    ).then((results) => {
      if (!active) return
      setGitStatusByWorkspace(
        Object.fromEntries(results.filter((entry): entry is [string, GitStatus] => entry !== null))
      )
    })
    return () => {
      active = false
    }
  }, [workspaces])

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
    <div className="flex h-full min-w-0 flex-col gap-3 overflow-auto p-1">
      <div className="ndx-os-panel flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="text-meta uppercase tracking-wide text-text-tertiary">Workspace hub</p>
          <h1 className="truncate text-title font-semibold text-text-primary">Workspaces</h1>
        </div>
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
        <NdxTvShelf
          title="All workspaces"
          subtitle={`${workspaces.length} persisted`}
          icon={<TvCategoryIcon category="Workspaces" />}
        >
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              id={workspace.id}
              name={workspace.name}
              rootPath={workspace.rootPath}
              createdAt={workspace.createdAt}
              gitStatus={gitStatusByWorkspace[workspace.id]}
              onOpen={() => {
                setActive(workspace.id)
                navigate('/workspaces/detail')
              }}
              onRemove={() => void remove(workspace.id)}
            />
          ))}
        </NdxTvShelf>
      )}
    </div>
  )
}

function WorkspaceCard({
  id,
  name,
  rootPath,
  createdAt,
  gitStatus,
  onOpen,
  onRemove
}: {
  id: string
  name: string
  rootPath: string
  createdAt: number
  gitStatus?: GitStatus
  onOpen: () => void
  onRemove: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLDivElement>({
    id: `workspace-card:${id}`,
    groupId: 'workspace-hub',
    onActivate: onOpen
  })

  return (
    <div ref={ref} tabIndex={-1} className="ndx-tv-card shrink-0">
      <NdxSpatialLockup selected={isFocused}>
        <section className="flex min-h-40 flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-body font-semibold text-text-primary">{name}</p>
            {gitStatus?.isRepository && gitStatus.branch && (
              <span className="flex shrink-0 items-center gap-1 rounded-sm border border-border bg-surface-raised/60 px-1.5 py-0.5 text-meta text-text-secondary">
                <GitBranch aria-hidden className="size-3 shrink-0" />
                {gitStatus.branch}
              </span>
            )}
          </div>
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
    </div>
  )
}
