import { useState } from 'react'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState } from '../../components/feedback/UXState'
import { FileManager } from './FileManager'
import { WorkspaceGitTab } from './WorkspaceGitTab'
import { useWorkspaces } from './useWorkspaces'

type Tab = 'overview' | 'files' | 'git'

/**
 * ND-019 Workspace Detail, scoped to three of the spec's nine tabs (Overview,
 * Files, Git) — the other six (Sessions, Tasks, Models, Permissions,
 * Environment, History) each need a service that doesn't exist yet (Epic
 * 8/9/10). Overview only shows fields that are genuinely real: name,
 * root path, created date. "Workspace health," "recommended next
 * actions," and "current agents" all need services this epic doesn't own.
 */
export function WorkspaceDetail(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()
  const [tab, setTab] = useState<Tab>('overview')

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="No active workspace"
        description="Open a workspace from the Workspace Hub first."
      />
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <p className="text-title font-semibold text-text-primary">{activeWorkspace.name}</p>
        <p className="text-meta text-text-secondary">{activeWorkspace.rootPath}</p>
      </div>
      <div className="flex gap-2">
        <ControllerButton
          variant={tab === 'overview' ? 'primary' : 'secondary'}
          onClick={() => setTab('overview')}
        >
          Overview
        </ControllerButton>
        <ControllerButton
          variant={tab === 'files' ? 'primary' : 'secondary'}
          onClick={() => setTab('files')}
        >
          Files
        </ControllerButton>
        <ControllerButton
          variant={tab === 'git' ? 'primary' : 'secondary'}
          onClick={() => setTab('git')}
        >
          Git
        </ControllerButton>
      </div>
      <div className="min-h-0 flex-1">
        {tab === 'overview' ? (
          <dl className="flex flex-col gap-2 text-meta text-text-secondary">
            <div className="flex gap-2">
              <dt className="text-text-tertiary">Created</dt>
              <dd className="text-text-primary">
                {new Date(activeWorkspace.createdAt).toLocaleString()}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-tertiary">Recovery points</dt>
              <dd className="text-text-primary">None yet — Recovery Service ships in Epic 11</dd>
            </div>
          </dl>
        ) : tab === 'files' ? (
          <FileManager />
        ) : (
          <WorkspaceGitTab workspaceId={activeWorkspace.id} />
        )}
      </div>
    </div>
  )
}
