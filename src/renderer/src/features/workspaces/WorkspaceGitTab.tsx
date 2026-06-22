import { useCallback, useEffect, useState } from 'react'
import type { GitBranch, GitCommit, GitFileChange, GitStatus } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import {
  checkoutGitBranch,
  commitGit,
  getGitLog,
  getGitStatus,
  listGitBranches,
  stageGitPaths,
  unstageGitPaths
} from '../../services/ipc/gitClient'

export interface WorkspaceGitTabProps {
  workspaceId: string
}

/**
 * Real Git tab (mega-prompt §22), scoped to status/stage/unstage/commit/
 * branch-list/checkout/log — the operations that are safe to expose without
 * an approval pipeline since they're directly user-initiated, not
 * AI-originated. Push/pull/fetch/stash/restore/conflict-resolution are
 * deferred: each needs real remote-connectivity testing this environment
 * can't exercise yet, and "commit and push are separate approvals" (§22)
 * implies push needs its own dedicated review surface, not a quick add-on
 * to this tab. Diff viewing is deferred to the same "needs a dedicated
 * renderer" reasoning as File Preview's richer formats (Epic 5).
 */
export function WorkspaceGitTab({ workspaceId }: WorkspaceGitTabProps): React.JSX.Element {
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [log, setLog] = useState<GitCommit[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [statusResult, branchesResult, logResult] = await Promise.all([
      getGitStatus({ workspaceId }),
      listGitBranches({ workspaceId }),
      getGitLog({ workspaceId })
    ])
    if (statusResult.ok) {
      setStatus(statusResult.data)
      setError(null)
    } else {
      setError(statusResult.error.userMessage)
    }
    if (branchesResult.ok) setBranches(branchesResult.data)
    if (logResult.ok) setLog(logResult.data)
  }, [workspaceId])

  useEffect(() => {
    let active = true
    void Promise.all([
      getGitStatus({ workspaceId }),
      listGitBranches({ workspaceId }),
      getGitLog({ workspaceId })
    ]).then(([statusResult, branchesResult, logResult]) => {
      if (!active) return
      if (statusResult.ok) {
        setStatus(statusResult.data)
        setError(null)
      } else {
        setError(statusResult.error.userMessage)
      }
      if (branchesResult.ok) setBranches(branchesResult.data)
      if (logResult.ok) setLog(logResult.data)
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
    await refresh()
  }

  async function handleCommit(): Promise<void> {
    const result = await commitGit({ workspaceId, message })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
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
    <div className="flex h-full gap-4 overflow-auto">
      <div className="flex w-1/2 flex-col gap-4">
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
                  key={change.path}
                  change={change}
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
                  key={change.path}
                  change={change}
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
            onClick={() => void handleCommit()}
          >
            Commit
          </ControllerButton>
        </section>
      </div>

      <div className="flex w-1/2 flex-col gap-4">
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
      </div>
    </div>
  )
}

function ChangeRow({
  change,
  onToggle
}: {
  change: GitFileChange
  onToggle: () => void
}): React.JSX.Element {
  return (
    <li className="flex items-center justify-between text-meta text-text-primary">
      <span>
        <span className="text-text-tertiary">{change.status}</span> {change.path}
      </span>
      <ControllerButton variant="ghost" onClick={onToggle}>
        {change.staged ? 'Unstage' : 'Stage'}
      </ControllerButton>
    </li>
  )
}
