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
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { GitDiffViewer } from '../git/GitDiffViewer'
import {
  checkoutGitBranch,
  commitGit,
  fetchGit,
  getGitDiff,
  getGitLog,
  getGitStatus,
  listGitBranches,
  listGitRemotes,
  listGitStashes,
  popGitStash,
  pullGit,
  pushGit,
  stageGitPaths,
  stashSaveGit,
  unstageGitPaths
} from '../../services/ipc/gitClient'

export interface WorkspaceGitTabProps {
  workspaceId: string
}

/**
 * Real Git tab (mega-prompt §22): status/stage/unstage/commit/branch-list/
 * checkout/log/fetch/pull/push/stash. Push always opens its own review
 * dialog, separate from the commit review — "commit and push are separate
 * approvals" (§22). Restore/discard/conflict-resolution UI and force push
 * remain out of scope: discard needs Epic 11's Recovery Service, and force
 * push is flagged critical risk in the spec with no real review surface
 * built for it yet.
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

  return (
    <div className="grid h-full min-w-[58rem] grid-cols-[minmax(16rem,0.8fr)_minmax(22rem,1.35fr)_minmax(14rem,0.7fr)] gap-3 overflow-auto">
      <div className="flex min-h-0 flex-col gap-4 overflow-auto border border-border bg-surface p-3">
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
            className="rounded-md border border-border bg-surface p-2 text-body text-text-primary"
          />
          <ControllerButton
            variant="primary"
            disabled={staged.length === 0 || message.trim().length === 0}
            onClick={() => setCommitReviewOpen(true)}
          >
            Review commit
          </ControllerButton>
        </section>
      </div>

      <GitDiffViewer path={selectedChange?.path ?? null} diff={diff} loading={diffLoading} />

      <div className="flex min-h-0 flex-col gap-4 overflow-auto border border-border bg-surface p-3">
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
              </div>
            </div>
          )}
        </section>

        <section>
          <p className="mb-1 text-meta font-semibold text-text-primary">Branches</p>
          <ul className="flex flex-col gap-1">
            {branches.map((branch) => (
              <li key={branch.name} className="flex items-center justify-between">
                <span className={branch.current ? 'text-text-primary' : 'text-text-secondary'}>
                  {branch.current ? '● ' : ''}
                  {branch.name}
                </span>
                {!branch.current && (
                  <ControllerButton
                    variant="ghost"
                    onClick={() => void handleCheckout(branch.name)}
                  >
                    Checkout
                  </ControllerButton>
                )}
              </li>
            ))}
          </ul>
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
      </div>
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
    </div>
  )
}

function ChangeRow({
  change,
  selected,
  onPreview,
  onToggle
}: {
  change: GitFileChange
  selected: boolean
  onPreview: () => void
  onToggle: () => void
}): React.JSX.Element {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 text-meta text-text-primary">
      <ControllerButton
        variant={selected ? 'secondary' : 'ghost'}
        className="min-w-0 justify-start px-2 font-mono text-meta"
        aria-pressed={selected}
        onClick={onPreview}
      >
        <span className="text-text-tertiary">{change.status}</span>
        <span className="truncate">{change.path}</span>
      </ControllerButton>
      <ControllerButton variant="ghost" onClick={onToggle}>
        {change.staged ? 'Unstage' : 'Stage'}
      </ControllerButton>
    </li>
  )
}
