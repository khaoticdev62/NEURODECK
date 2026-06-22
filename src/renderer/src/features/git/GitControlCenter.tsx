import { EmptyState } from '../../components/feedback/UXState'
import { WorkspaceGitTab } from '../workspaces/WorkspaceGitTab'
import { useWorkspaces } from '../workspaces/useWorkspaces'

/** ND-025 Git Control Center. Remote and recovery-dependent sections remain deferred. */
export function GitControlCenter(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="No active workspace"
        description="Open a workspace before using Git Control Center."
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <header className="flex items-end justify-between border-b border-border pb-3">
        <div>
          <p className="text-meta uppercase tracking-[0.18em] text-text-tertiary">ND-025</p>
          <h1 className="text-title font-semibold text-text-primary">Git Control Center</h1>
          <p className="text-meta text-text-secondary">{activeWorkspace.rootPath}</p>
        </div>
        <p className="max-w-sm text-right text-meta text-text-tertiary">
          Local operations only. Push and destructive restore actions require separate review paths.
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <WorkspaceGitTab workspaceId={activeWorkspace.id} />
      </div>
    </div>
  )
}
