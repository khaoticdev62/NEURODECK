import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  GitBranch,
  GitCommit,
  GitFileChange,
  GitRemote,
  GitStashEntry,
  GitStatus
} from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { cn } from '../../components/primitives/cn'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { GitDiffViewer } from '../git/GitDiffViewer'
import {
  checkoutGitBranch,
  commitGit,
  createGitBranch,
  deleteGitBranch,
  fetchGit,
  forcePushGit,
  getGitDiff,
  getGitLog,
  getGitStatus,
  listGitBranches,
  listGitRemotes,
  listGitStashes,
  popGitStash,
  pullGit,
  pushGit,
  restoreGitPaths,
  stageGitPaths,
  stashSaveGit,
  unstageGitPaths
} from '../../services/ipc/gitClient'

export interface WorkspaceGitTabProps {
  workspaceId: string
}

/**
 * Recovery branches (ND-025's own "Recovery branches" section, distinct
 * from Recovery Timeline's per-file content checkpoints) are just real Git
 * branches created at the current commit via the same `createGitBranch`
 * IPC every other branch goes through — no new backend surface, just a
 * naming convention this prefix identifies for the UI's separate section.
 */
const RECOVERY_BRANCH_PREFIX = 'recovery/'

function recoveryBranchName(): string {
  const now = new Date()
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${RECOVERY_BRANCH_PREFIX}${stamp}`
}

/**
 * Real Git tab (mega-prompt §22): status/stage/unstage/commit/branch-list/
 * checkout/log/fetch/pull/push/stash/restore/branch-create/branch-delete/
 * force-push. Push always opens its own review dialog, separate from the
 * commit review — "commit and push are separate approvals" (§22). Discard
 * (`restore`) goes through `registerGitHandlers.ts`'s `gitRestore` channel,
 * which records a real Recovery checkpoint of each file's current content
 * before discarding — the blocking condition for implementing discard at
 * all. Force push uses `--force-with-lease` (fails closed on a moved
 * remote ref, never blind `--force`) and requires its own separate,
 * more severe confirmation that repeats the exact branch and remote name.
 * Conflict-resolution UI remains out of scope.
 */
export function WorkspaceGitTab({ workspaceId }: WorkspaceGitTabProps): React.JSX.Element {
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [log, setLog] = useState<GitCommit[]>([])
  const [remotes, setRemotes] = useState<GitRemote[]>([])
  const [stashes, setStashes] = useState<GitStashEntry[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedChange, setSelectedChange] = useState<GitFileChange | null>(null)
  const [diff, setDiff] = useState<string | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [commitReviewOpen, setCommitReviewOpen] = useState(false)
  const [pushReviewOpen, setPushReviewOpen] = useState(false)
  const [forcePushReviewOpen, setForcePushReviewOpen] = useState(false)
  const [discardReview, setDiscardReview] = useState<GitFileChange | null>(null)
  const [deleteBranchReview, setDeleteBranchReview] = useState<{
    name: string
    force: boolean
  } | null>(null)
  const [newBranchName, setNewBranchName] = useState('')
  const diffRequestId = useRef(0)

  const refresh = useCallback(async () => {
    const [statusResult, branchesResult, logResult, remotesResult, stashesResult] =
      await Promise.all([
        getGitStatus({ workspaceId }),
        listGitBranches({ workspaceId }),
        getGitLog({ workspaceId }),
        listGitRemotes({ workspaceId }),
        listGitStashes({ workspaceId })
      ])
    if (statusResult.ok) {
      setStatus(statusResult.data)
      setError(null)
    } else {
      setError(statusResult.error.userMessage)
    }
    if (branchesResult.ok) setBranches(branchesResult.data)
    if (logResult.ok) setLog(logResult.data)
    if (remotesResult.ok) setRemotes(remotesResult.data)
    if (stashesResult.ok) setStashes(stashesResult.data)
  }, [workspaceId])

  useEffect(() => {
    let active = true
    void Promise.all([
      getGitStatus({ workspaceId }),
      listGitBranches({ workspaceId }),
      getGitLog({ workspaceId }),
      listGitRemotes({ workspaceId }),
      listGitStashes({ workspaceId })
    ]).then(([statusResult, branchesResult, logResult, remotesResult, stashesResult]) => {
      if (!active) return
      if (statusResult.ok) {
        setStatus(statusResult.data)
        setError(null)
      } else {
        setError(statusResult.error.userMessage)
      }
      if (branchesResult.ok) setBranches(branchesResult.data)
      if (logResult.ok) setLog(logResult.data)
      if (remotesResult.ok) setRemotes(remotesResult.data)
      if (stashesResult.ok) setStashes(stashesResult.data)
    })
    return () => {
      active = false
    }
  }, [workspaceId])

  async function toggleStage(change: GitFileChange): Promise<void> {
    const result = change.staged
      ? await unstageGitPaths({ workspaceId, paths: [change.path] })
      : await stageGitPaths({ workspaceId, paths: [change.path] })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    if (selectedChange?.path === change.path && selectedChange.staged === change.staged) {
      setSelectedChange(null)
      setDiff(null)
    }
    await refresh()
  }

  async function performCommit(): Promise<void> {
    const result = await commitGit({ workspaceId, message: message.trim() })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setCommitReviewOpen(false)
    setMessage('')
    await refresh()
  }

  async function handleCheckout(branch: string): Promise<void> {
    const result = await checkoutGitBranch({ workspaceId, branch })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    await refresh()
  }

  async function handleFetch(remote: string): Promise<void> {
    const result = await fetchGit({ workspaceId, remote })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setError(null)
    await refresh()
  }

  async function handlePull(remote: string, branch: string): Promise<void> {
    const result = await pullGit({ workspaceId, remote, branch })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setError(null)
    await refresh()
  }

  async function performPush(remote: string, branch: string): Promise<void> {
    const result = await pushGit({ workspaceId, remote, branch })
    if (!result.ok) {
      setError(result.error.userMessage)
      setPushReviewOpen(false)
      return
    }
    setError(null)
    setPushReviewOpen(false)
    await refresh()
  }

  async function performForcePush(remote: string, branch: string): Promise<void> {
    const result = await forcePushGit({ workspaceId, remote, branch })
    setForcePushReviewOpen(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setError(null)
    await refresh()
  }

  async function performDiscard(change: GitFileChange): Promise<void> {
    const result = await restoreGitPaths({ workspaceId, paths: [change.path] })
    setDiscardReview(null)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    if (selectedChange?.path === change.path) {
      setSelectedChange(null)
      setDiff(null)
    }
    setError(null)
    await refresh()
  }

  async function handleCreateBranch(): Promise<void> {
    const name = newBranchName.trim()
    if (!name) return
    const result = await createGitBranch({ workspaceId, name })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setError(null)
    setNewBranchName('')
    await refresh()
  }

  async function handleCreateRecoveryPoint(): Promise<void> {
    const result = await createGitBranch({ workspaceId, name: recoveryBranchName() })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setError(null)
    await refresh()
  }

  async function performDeleteBranch(name: string, force: boolean): Promise<void> {
    const result = await deleteGitBranch({ workspaceId, name, force })
    setDeleteBranchReview(null)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setError(null)
    await refresh()
  }

  async function handleStashSave(): Promise<void> {
    const result = await stashSaveGit({ workspaceId })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setError(null)
    await refresh()
  }

  async function handleStashPop(index: number): Promise<void> {
    const result = await popGitStash({ workspaceId, index })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setError(null)
    await refresh()
  }

  async function previewChange(change: GitFileChange): Promise<void> {
    const requestId = diffRequestId.current + 1
    diffRequestId.current = requestId
    setSelectedChange(change)
    setDiffLoading(true)
    const result = await getGitDiff({ workspaceId, path: change.path, staged: change.staged })
    if (requestId !== diffRequestId.current) return
    setDiffLoading(false)
    if (!result.ok) {
      setDiff(null)
      setError(result.error.userMessage)
      return
    }
    setDiff(result.data.diff)
    setError(null)
  }

  if (!status && error) {
    return <ErrorState title="Git status unavailable" description={error} />
  }

  if (!status) {
    return <p className="p-4 text-meta text-text-secondary">Loading…</p>
  }

  if (!status.isRepository) {
    return (
      <EmptyState
        title="Not a Git repository"
        description="This workspace's folder has no .git directory."
      />
    )
  }

  const staged = status.changes.filter((change) => change.staged)
  const unstaged = status.changes.filter((change) => !change.staged)
  const regularBranches = branches.filter(
    (branch) => !branch.name.startsWith(RECOVERY_BRANCH_PREFIX)
  )
  const recoveryBranches = branches.filter((branch) =>
    branch.name.startsWith(RECOVERY_BRANCH_PREFIX)
  )

  return (
    <div className="grid h-full min-w-[58rem] grid-cols-[18rem_minmax(24rem,1fr)_18rem] gap-2 overflow-auto">
      <NdxToolWindow title="Source Control" subtitle={status.branch ?? 'detached HEAD'}>
        <div className="flex items-center justify-between text-meta text-text-secondary">
          <span>
            Branch: <span className="text-text-primary">{status.branch ?? 'detached HEAD'}</span>
          </span>
          {(status.ahead > 0 || status.behind > 0) && (
            <span>
              ↑{status.ahead} ↓{status.behind}
            </span>
          )}
        </div>

        {error && <ErrorState title="Git operation failed" description={error} />}

        <section>
          <p className="mb-1 text-meta font-semibold text-text-primary">Staged ({staged.length})</p>
          {staged.length === 0 ? (
            <p className="text-meta text-text-tertiary">Nothing staged.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {staged.map((change) => (
                <ChangeRow
                  key={`${change.path}:staged`}
                  change={change}
                  selected={selectedChange?.path === change.path && selectedChange.staged}
                  onPreview={() => void previewChange(change)}
                  onToggle={() => void toggleStage(change)}
                />
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="mb-1 text-meta font-semibold text-text-primary">
            Changes ({unstaged.length})
          </p>
          {unstaged.length === 0 ? (
            <p className="text-meta text-text-tertiary">No unstaged changes.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {unstaged.map((change) => (
                <ChangeRow
                  key={`${change.path}:unstaged`}
                  change={change}
                  selected={selectedChange?.path === change.path && !selectedChange.staged}
                  onPreview={() => void previewChange(change)}
                  onToggle={() => void toggleStage(change)}
                  onDiscard={change.status === '??' ? undefined : () => setDiscardReview(change)}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Commit message"
            rows={3}
            className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
          />
          <ControllerButton
            variant="primary"
            disabled={staged.length === 0 || message.trim().length === 0}
            onClick={() => setCommitReviewOpen(true)}
          >
            Review commit
          </ControllerButton>
        </section>
      </NdxToolWindow>

      <NdxEditorShell title={selectedChange?.path ?? 'Diff Viewer'}>
        <GitDiffViewer path={selectedChange?.path ?? null} diff={diff} loading={diffLoading} />
      </NdxEditorShell>

      <NdxToolWindow title="Repository" subtitle={remotes[0]?.name ?? 'Local'} side="right">
        <section>
          <p className="mb-1 text-meta font-semibold text-text-primary">Remote</p>
          {remotes.length === 0 ? (
            <p className="text-meta text-text-tertiary">No remote configured.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="truncate text-meta text-text-secondary">{remotes[0].name}</p>
              <div className="flex gap-2">
                <ControllerButton variant="ghost" onClick={() => void handleFetch(remotes[0].name)}>
                  Fetch
                </ControllerButton>
                <ControllerButton
                  variant="ghost"
                  disabled={!status.branch}
                  onClick={() => status.branch && void handlePull(remotes[0].name, status.branch)}
                >
                  Pull
                </ControllerButton>
                <ControllerButton
                  variant="primary"
                  disabled={!status.branch}
                  onClick={() => setPushReviewOpen(true)}
                >
                  Push
                </ControllerButton>
                <ControllerButton
                  variant="destructive"
                  disabled={!status.branch}
                  onClick={() => setForcePushReviewOpen(true)}
                >
                  Force push
                </ControllerButton>
              </div>
            </div>
          )}
        </section>

        <section>
          <p className="mb-1 text-meta font-semibold text-text-primary">Branches</p>
          <div className="mb-2 flex gap-2">
            <input
              value={newBranchName}
              onChange={(event) => setNewBranchName(event.target.value)}
              placeholder="New branch name"
              className="min-w-0 flex-1 rounded-md border border-border bg-canvas p-1.5 text-meta text-text-primary"
            />
            <ControllerButton
              variant="secondary"
              disabled={!newBranchName.trim()}
              onClick={() => void handleCreateBranch()}
            >
              Create
            </ControllerButton>
          </div>
          <ul className="flex flex-col gap-1">
            {regularBranches.map((branch) => (
              <li key={branch.name} className="flex items-center justify-between gap-1">
                <span className={branch.current ? 'text-text-primary' : 'text-text-secondary'}>
                  {branch.current ? '● ' : ''}
                  {branch.name}
                </span>
                {!branch.current && (
                  <div className="flex gap-1">
                    <ControllerButton
                      variant="ghost"
                      onClick={() => void handleCheckout(branch.name)}
                    >
                      Checkout
                    </ControllerButton>
                    <ControllerButton
                      variant="destructive"
                      onClick={() => setDeleteBranchReview({ name: branch.name, force: false })}
                    >
                      Delete
                    </ControllerButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="mb-1 text-meta font-semibold text-text-primary">Recovery branches</p>
          <p className="mb-2 text-meta text-text-tertiary">
            A real branch pointing at the current commit — a safety net before a risky operation,
            separate from Recovery Timeline&apos;s per-file checkpoints.
          </p>
          <ControllerButton
            variant="secondary"
            className="mb-2"
            disabled={!status.branch}
            onClick={() => void handleCreateRecoveryPoint()}
          >
            Create recovery point
          </ControllerButton>
          {recoveryBranches.length === 0 ? (
            <p className="text-meta text-text-tertiary">No recovery branches yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {recoveryBranches.map((branch) => (
                <li key={branch.name} className="flex items-center justify-between gap-1">
                  <span className="font-mono text-meta text-text-secondary">{branch.name}</span>
                  <div className="flex gap-1">
                    <ControllerButton
                      variant="ghost"
                      onClick={() => void handleCheckout(branch.name)}
                    >
                      Checkout
                    </ControllerButton>
                    <ControllerButton
                      variant="destructive"
                      onClick={() => setDeleteBranchReview({ name: branch.name, force: false })}
                    >
                      Delete
                    </ControllerButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="mb-1 text-meta font-semibold text-text-primary">History</p>
          {log.length === 0 ? (
            <p className="text-meta text-text-tertiary">No commits yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {log.map((commit) => (
                <li key={commit.hash} className="text-meta text-text-secondary">
                  <span className="text-text-tertiary">{commit.shortHash}</span> {commit.message}
                  <div className="text-text-tertiary">
                    {commit.author} · {new Date(commit.date).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="mb-1 text-meta font-semibold text-text-primary">Stash</p>
          <ControllerButton
            variant="ghost"
            className="mb-2"
            disabled={status.changes.length === 0}
            onClick={() => void handleStashSave()}
          >
            Stash changes
          </ControllerButton>
          {stashes.length === 0 ? (
            <p className="text-meta text-text-tertiary">No stashed changes.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {stashes.map((stash) => (
                <li
                  key={stash.index}
                  className="flex items-center justify-between text-meta text-text-secondary"
                >
                  <span className="truncate">{stash.message}</span>
                  <ControllerButton
                    variant="ghost"
                    onClick={() => void handleStashPop(stash.index)}
                  >
                    Pop
                  </ControllerButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </NdxToolWindow>
      <ConfirmationDialog
        open={commitReviewOpen}
        title="Review local commit"
        action={`Create a commit with message: “${message.trim()}”`}
        scope={`${staged.length} staged ${staged.length === 1 ? 'file' : 'files'} on ${status.branch ?? 'detached HEAD'}`}
        consequence="This records the staged patch locally. It does not push to a remote."
        confirmLabel="Commit locally"
        onConfirm={() => void performCommit()}
        onCancel={() => setCommitReviewOpen(false)}
      />
      <ConfirmationDialog
        open={pushReviewOpen}
        title="Review push"
        action={`Push ${status.branch ?? 'this branch'} to ${remotes[0]?.name ?? 'the remote'}`}
        scope={remotes[0]?.pushUrl}
        consequence="This sends local commits to the remote. It does not force-push or rewrite remote history."
        confirmLabel="Push"
        onConfirm={() => {
          if (status.branch && remotes[0]) void performPush(remotes[0].name, status.branch)
        }}
        onCancel={() => setPushReviewOpen(false)}
      />
      <ConfirmationDialog
        open={forcePushReviewOpen}
        title="Review force push"
        action={`Force-push ${status.branch ?? 'this branch'} to ${remotes[0]?.name ?? 'the remote'}`}
        scope={remotes[0]?.pushUrl}
        consequence={`This can overwrite history on ${remotes[0]?.name ?? 'the remote'}'s ${status.branch ?? 'this branch'} for anyone else using it. Uses --force-with-lease, so it fails instead of overwriting if the remote moved since your last fetch — it is not a guarantee against all data loss.`}
        confirmLabel="Force push"
        onConfirm={() => {
          if (status.branch && remotes[0]) void performForcePush(remotes[0].name, status.branch)
        }}
        onCancel={() => setForcePushReviewOpen(false)}
      />
      <ConfirmationDialog
        open={discardReview !== null}
        title="Discard changes"
        action={`Discard uncommitted changes to ${discardReview?.path ?? 'this file'}`}
        scope={status.branch ?? undefined}
        consequence="This permanently loses the uncommitted edits in your working tree. A recovery checkpoint of the current content is recorded first, so it can still be restored from Recovery Timeline."
        confirmLabel="Discard"
        onConfirm={() => {
          if (discardReview) void performDiscard(discardReview)
        }}
        onCancel={() => setDiscardReview(null)}
      />
      <ConfirmationDialog
        open={deleteBranchReview !== null}
        title="Delete branch"
        action={`Delete local branch ${deleteBranchReview?.name ?? ''}`}
        consequence={
          deleteBranchReview?.force
            ? 'This branch has unmerged commits — forcing deletion permanently loses any commits that exist only on it.'
            : 'This only succeeds if the branch is fully merged elsewhere; otherwise it is rejected rather than silently forced.'
        }
        confirmLabel={deleteBranchReview?.force ? 'Force delete' : 'Delete'}
        onConfirm={() => {
          if (deleteBranchReview) {
            void performDeleteBranch(deleteBranchReview.name, deleteBranchReview.force)
          }
        }}
        onCancel={() => setDeleteBranchReview(null)}
      />
    </div>
  )
}

function ChangeRow({
  change,
  selected,
  onPreview,
  onToggle,
  onDiscard
}: {
  change: GitFileChange
  selected: boolean
  onPreview: () => void
  onToggle: () => void
  onDiscard?: () => void
}): React.JSX.Element {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 text-meta text-text-primary">
      <ControllerButton
        variant="ghost"
        className={cn(
          'min-w-0 justify-start rounded-sm border border-transparent px-2 font-mono text-meta',
          selected
            ? 'border-[var(--ndx-workbench-active-pane-border)] bg-[var(--ndx-workbench-selected-row-bg)]'
            : ''
        )}
        aria-pressed={selected}
        onClick={onPreview}
      >
        <span className="text-text-tertiary">{change.status}</span>
        <span className="truncate">{change.path}</span>
      </ControllerButton>
      <ControllerButton variant="ghost" onClick={onToggle}>
        {change.staged ? 'Unstage' : 'Stage'}
      </ControllerButton>
      {onDiscard && (
        <ControllerButton variant="destructive" onClick={onDiscard}>
          Discard
        </ControllerButton>
      )}
    </li>
  )
}
