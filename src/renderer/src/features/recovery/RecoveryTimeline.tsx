import { useCallback, useEffect, useState } from 'react'
import type { RecoveryCheckpoint } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import { GitDiffViewer } from '../git/GitDiffViewer'
import {
  getRecoveryDiff,
  listRecoveryCheckpoints,
  restoreRecoveryCheckpoint
} from '../../services/ipc/recoveryClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'

const REVERSIBILITY_LABEL: Record<RecoveryCheckpoint['reversibility'], string> = {
  'fully-reversible': 'Fully reversible',
  'partially-reversible': 'Partially reversible',
  'manually-recoverable': 'Manually recoverable',
  'irreversible-external-effect': 'Irreversible external effect'
}

/**
 * ND-052 Recovery Timeline + ND-053 Before/After Diff, combined the same
 * way ND-025 Git Control Center wraps its diff viewer — one real
 * checkpoint list, real before/after diff on selection. Covers `file-write`
 * (Build Studio/file edits) and `git-restore` (a discarded working-tree
 * change recorded just before `git restore` runs — see
 * `registerGitHandlers.ts`) checkpoint kinds. Package installation,
 * settings changes, workflow checkpoints, Git commits themselves, agent
 * operations, and system configuration events all need services that don't
 * exist yet (Epic 6's Git commit history is its own; Epic 8/9/11's other
 * event sources aren't built). Revert event/branch from point/export
 * snapshot remain deferred.
 */
export function RecoveryTimeline(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="No active workspace"
        description="Open a workspace to see its recovery history."
      />
    )
  }

  return <RecoveryTimelineWorkspace key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
}

function RecoveryTimelineWorkspace({ workspaceId }: { workspaceId: string }): React.JSX.Element {
  const [checkpoints, setCheckpoints] = useState<RecoveryCheckpoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<RecoveryCheckpoint | null>(null)
  const [diff, setDiff] = useState<string | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [restoreReviewOpen, setRestoreReviewOpen] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const refresh = useCallback(async () => {
    const result = await listRecoveryCheckpoints({ workspaceId })
    if (result.ok) {
      setCheckpoints(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }, [workspaceId])

  useEffect(() => {
    let active = true
    void listRecoveryCheckpoints({ workspaceId }).then((result) => {
      if (!active) return
      if (result.ok) {
        setCheckpoints(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [workspaceId])

  async function selectCheckpoint(checkpoint: RecoveryCheckpoint): Promise<void> {
    setSelected(checkpoint)
    setDiffLoading(true)
    const result = await getRecoveryDiff({ workspaceId, checkpointId: checkpoint.id })
    setDiffLoading(false)
    if (result.ok) {
      setDiff(result.data.diff)
      setError(null)
    } else {
      setDiff(null)
      setError(result.error.userMessage)
    }
  }

  async function performRestore(): Promise<void> {
    if (!selected) return
    setRestoring(true)
    const result = await restoreRecoveryCheckpoint({ workspaceId, checkpointId: selected.id })
    setRestoring(false)
    setRestoreReviewOpen(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setError(null)
    await refresh()
  }

  return (
    <div className="grid h-full min-w-[64rem] grid-cols-[22rem_minmax(36rem,1fr)] gap-2 overflow-auto">
      <NdxToolWindow title="Recovery Timeline" subtitle={`${checkpoints.length} checkpoints`}>
        <p className="text-title font-semibold text-text-primary">Recovery Timeline</p>
        {error && <ErrorState title="Recovery error" description={error} />}
        {checkpoints.length === 0 ? (
          <EmptyState
            title="No recovery checkpoints yet"
            description="Checkpoints appear here after a file is saved."
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {checkpoints.map((checkpoint) => (
              <CheckpointRow
                key={checkpoint.id}
                checkpoint={checkpoint}
                selected={selected?.id === checkpoint.id}
                onSelect={() => void selectCheckpoint(checkpoint)}
              />
            ))}
          </ul>
        )}
      </NdxToolWindow>

      <NdxEditorShell title="Before / After Diff">
        <div className="flex min-h-full min-w-0 flex-col gap-2 p-2">
          {selected && (
            <div className="flex items-center justify-between border border-border bg-surface p-2">
              <div>
                <p className="text-meta text-text-primary">{selected.description}</p>
                <p className="text-meta text-text-tertiary">
                  {REVERSIBILITY_LABEL[selected.reversibility]}
                </p>
              </div>
              <ControllerButton
                variant="primary"
                disabled={!selected.hadPreviousContent || restoring}
                onClick={() => setRestoreReviewOpen(true)}
              >
                {restoring ? 'Restoring…' : 'Restore to this point'}
              </ControllerButton>
            </div>
          )}
          <div className="min-h-0 flex-1">
            <GitDiffViewer
              path={selected?.relativePath ?? null}
              diff={diff}
              loading={diffLoading}
            />
          </div>
        </div>
      </NdxEditorShell>

      <ConfirmationDialog
        open={restoreReviewOpen}
        title="Restore recovery checkpoint"
        action={`Restore "${selected?.relativePath}" to its state before "${selected?.description}"`}
        scope={selected?.relativePath}
        consequence="This overwrites the file's current content. The current content is itself recorded as a new recovery checkpoint first, so this can be undone."
        confirmLabel="Restore"
        onConfirm={() => void performRestore()}
        onCancel={() => setRestoreReviewOpen(false)}
      />
    </div>
  )
}

function CheckpointRow({
  checkpoint,
  selected,
  onSelect
}: {
  checkpoint: RecoveryCheckpoint
  selected: boolean
  onSelect: () => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `recovery-checkpoint:${checkpoint.id}`,
    groupId: 'recovery-timeline',
    onActivate: onSelect
  })

  return (
    <li>
      <ControllerButton
        ref={ref}
        variant={selected ? 'secondary' : 'ghost'}
        className="w-full flex-col items-start gap-0.5 px-2 py-2 text-left"
        onClick={onSelect}
      >
        <span className="text-meta text-text-primary">{checkpoint.description}</span>
        <span className="text-meta text-text-tertiary">
          {checkpoint.relativePath} · {new Date(checkpoint.createdAt).toLocaleString()}
        </span>
        <span className="text-meta text-text-tertiary">
          {REVERSIBILITY_LABEL[checkpoint.reversibility]}
        </span>
      </ControllerButton>
    </li>
  )
}
