import { useState, useEffect } from 'react'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { FileManager } from './FileManager'
import { WorkspaceGitTab } from './WorkspaceGitTab'
import { useWorkspaces } from './useWorkspaces'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'

type Tab = 'overview' | 'files' | 'git'

/**
 * ND-019 Workspace Detail, scoped to three of the spec's nine tabs (Overview,
 * Files, Git). The remaining tabs need services that are intentionally not
 * invented here.
 */
export function WorkspaceDetail(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()
  const [tab, setTab] = useState<Tab>('overview')
  const setSecondary = useWorkbenchStore((state) => state.setSecondary)

  useEffect(() => {
    setSecondary(
      <NdxToolWindow title="Workspace Scope" subtitle={tab} side="right">
        <p className="text-meta text-text-secondary">
          Detail panes preserve the real file manager and Git integrations for this workspace.
        </p>
      </NdxToolWindow>
    )
    return () => setSecondary(null)
  }, [setSecondary, tab])

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="No active workspace"
        description="Open a workspace from the Workspace Hub first."
      />
    )
  }

  const tabs = (
    <div className="flex flex-col gap-2">
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
  )

  return (
    <div className="h-full bg-[var(--ndx-workbench-editor-bg)]">
      <NdxEditorShell title="Workspace Detail">
        <div className="flex h-full min-h-0 flex-col gap-4 p-4">
          <div>
            <p className="text-title font-semibold text-text-primary">{activeWorkspace.name}</p>
            <p className="text-meta text-text-secondary">{activeWorkspace.rootPath}</p>
          </div>
          <div>{tabs}</div>
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
                  <dd className="text-text-primary">
                    None yet - Recovery Service ships in Epic 11
                  </dd>
                </div>
              </dl>
            ) : tab === 'files' ? (
              <FileManager />
            ) : (
              <WorkspaceGitTab workspaceId={activeWorkspace.id} />
            )}
          </div>
        </div>
      </NdxEditorShell>
    </div>
  )
}
