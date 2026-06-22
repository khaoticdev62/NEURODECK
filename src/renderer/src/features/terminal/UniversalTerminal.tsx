import { useCallback, useEffect, useState } from 'react'
import type { TerminalSession, Workspace } from '@shared/contracts'
import { EmptyState } from '../../components/feedback/UXState'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { useFocusable } from '../../controller/focus/useFocusable'
import { getGitStatus } from '../../services/ipc/gitClient'
import {
  createTerminal,
  listTerminalSessions,
  onTerminalExit,
  terminateTerminal
} from '../../services/ipc/terminalClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import { TerminalViewport } from './TerminalViewport'

/** ND-028 Universal Terminal, local-session slice backed by the real PTY service. */
export function UniversalTerminal(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="No active workspace"
        description="Open a workspace before starting a terminal session."
      />
    )
  }

  return <WorkspaceTerminal key={activeWorkspace.id} workspace={activeWorkspace} />
}

function WorkspaceTerminal({
  workspace: activeWorkspace
}: {
  workspace: Workspace
}): React.JSX.Element {
  const [sessions, setSessions] = useState<TerminalSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [terminateReviewSessionId, setTerminateReviewSessionId] = useState<string | null>(null)
  const [branch, setBranch] = useState<string | null>(null)

  const handleViewportError = useCallback((message: string) => setError(message), [])

  useEffect(() => {
    let active = true
    const unsubscribeExit = onTerminalExit((event) => {
      if (!active || event.session.workspaceId !== activeWorkspace.id) return
      setSessions((current) =>
        current.map((session) => (session.id === event.session.id ? event.session : session))
      )
    })
    void Promise.all([
      listTerminalSessions({ workspaceId: activeWorkspace.id }),
      getGitStatus({ workspaceId: activeWorkspace.id })
    ]).then(([result, gitResult]) => {
      if (!active) return
      setLoading(false)
      if (!result.ok) {
        setError(result.error.userMessage)
        return
      }
      setSessions(result.data)
      setActiveSessionId((current) => current ?? result.data[0]?.id ?? null)
      if (gitResult.ok) setBranch(gitResult.data.branch)
    })
    return () => {
      active = false
      unsubscribeExit()
    }
  }, [activeWorkspace])

  async function handleCreate(): Promise<void> {
    const result = await createTerminal({ workspaceId: activeWorkspace.id, cols: 100, rows: 30 })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setError(null)
    setSessions((current) => [result.data, ...current])
    setActiveSessionId(result.data.id)
  }

  async function handleTerminate(sessionId: string): Promise<void> {
    const result = await terminateTerminal({ sessionId })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setTerminateReviewSessionId(null)
  }

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null

  return (
    <div className="grid h-full min-h-0 grid-cols-[15rem_minmax(0,1fr)] overflow-hidden border border-border bg-surface">
      <aside className="flex min-h-0 flex-col border-r border-border bg-surface-raised/40">
        <header className="border-b border-border p-3">
          <p className="text-meta uppercase tracking-[0.18em] text-text-tertiary">ND-028</p>
          <h1 className="text-title font-semibold text-text-primary">Universal Terminal</h1>
          <p className="truncate text-meta text-text-secondary">{activeWorkspace.name}</p>
          <p className="truncate text-meta text-text-tertiary">
            {branch ? `Branch ${branch}` : 'Local workspace'}
          </p>
        </header>
        <div className="p-2">
          <NewSessionButton onCreate={() => void handleCreate()} />
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
          {sessions.map((session) => (
            <SessionButton
              key={session.id}
              session={session}
              active={session.id === activeSessionId}
              onSelect={() => setActiveSessionId(session.id)}
            />
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col">
        {error && (
          <div
            role="alert"
            className="border-b border-status-error/40 bg-status-error/10 px-3 py-2"
          >
            <p className="text-meta font-semibold text-status-error">Terminal operation failed</p>
            <p className="text-meta text-text-secondary">{error}</p>
          </div>
        )}
        {activeSession ? (
          <>
            <header className="flex min-h-12 items-center justify-between border-b border-border px-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-meta text-text-primary">
                  {activeSession.shell} · {activeSession.cwd}
                </p>
                <p className="text-meta text-text-tertiary">
                  PID {activeSession.pid} · {activeSession.cols}×{activeSession.rows}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  tone={activeSession.status === 'running' ? 'success' : 'neutral'}
                  label={
                    activeSession.status === 'running'
                      ? 'Session running'
                      : `Exited ${activeSession.exitCode ?? ''}`.trim()
                  }
                />
                {activeSession.status === 'running' && (
                  <TerminateButton
                    onTerminate={() => setTerminateReviewSessionId(activeSession.id)}
                  />
                )}
              </div>
            </header>
            <div className="min-h-0 flex-1">
              <TerminalViewport session={activeSession} onError={handleViewportError} />
            </div>
          </>
        ) : loading ? (
          <p className="p-6 text-meta text-text-secondary">Loading sessions…</p>
        ) : (
          <EmptyState
            title="No terminal sessions"
            description="Start a local shell in this workspace. Sessions run in the workspace root."
            action={
              <NewSessionButton onCreate={() => void handleCreate()} suffix="Start session" />
            }
          />
        )}
      </section>
      <ConfirmationDialog
        open={terminateReviewSessionId !== null}
        title="Terminate terminal session"
        action={`Stop ${activeSession?.shell ?? 'the active shell'}`}
        scope={activeSession?.cwd}
        consequence="Running foreground processes in this terminal will be stopped."
        confirmLabel="Terminate session"
        onConfirm={() => {
          if (terminateReviewSessionId) void handleTerminate(terminateReviewSessionId)
        }}
        onCancel={() => setTerminateReviewSessionId(null)}
      />
    </div>
  )
}

function NewSessionButton({
  onCreate,
  suffix = 'New session'
}: {
  onCreate: () => void
  suffix?: string
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `terminal-new-${suffix}`,
    groupId: 'terminal-workstation',
    onActivate: onCreate
  })
  return (
    <ControllerButton ref={ref} variant="primary" className="w-full" onClick={onCreate}>
      + {suffix}
    </ControllerButton>
  )
}

function SessionButton({
  session,
  active,
  onSelect
}: {
  session: TerminalSession
  active: boolean
  onSelect: () => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `terminal-session-${session.id}`,
    groupId: 'terminal-workstation',
    onActivate: onSelect
  })
  return (
    <ControllerButton
      ref={ref}
      variant={active ? 'secondary' : 'ghost'}
      className="mb-1 w-full justify-between px-2"
      aria-pressed={active}
      onClick={onSelect}
    >
      <span className="truncate font-mono text-meta">{session.shell}</span>
      <span
        aria-label={session.status}
        className={`h-2 w-2 rounded-full ${session.status === 'running' ? 'bg-status-success' : 'bg-text-tertiary'}`}
      />
    </ControllerButton>
  )
}

function TerminateButton({ onTerminate }: { onTerminate: () => void }): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id: 'terminal-terminate-active',
    groupId: 'terminal-workstation',
    onActivate: onTerminate
  })
  return (
    <ControllerButton ref={ref} variant="destructive" onClick={onTerminate}>
      Terminate
    </ControllerButton>
  )
}
