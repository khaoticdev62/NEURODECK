import { useEffect, useState } from 'react'
import type { TerminalSession, Workspace } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { PaneGroup } from '../../components/primitives/PaneGroup'
import { useFocusable } from '../../controller/focus/useFocusable'
import {
  createTerminal,
  listTerminalSessions,
  onTerminalExit
} from '../../services/ipc/terminalClient'
import { TerminalViewport } from './TerminalViewport'

/**
 * Universal Terminal's Split mode — two independent session panes in a
 * `PaneGroup`. `TerminalViewport` already self-registers a focus node keyed
 * by `session.id` (`groupId: 'terminal-workstation'`), so running two
 * instances at once needs no special-casing — the Spatial Focus Engine's
 * geometric `move()` already disambiguates them by their real on-screen
 * rects.
 */
export function SplitTerminalPanel({ workspace }: { workspace: Workspace }): React.JSX.Element {
  const [sessions, setSessions] = useState<TerminalSession[]>([])
  const [leftSessionId, setLeftSessionId] = useState<string | null>(null)
  const [rightSessionId, setRightSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const unsubscribeExit = onTerminalExit((event) => {
      if (!active || event.session.workspaceId !== workspace.id) return
      setSessions((current) =>
        current.map((session) => (session.id === event.session.id ? event.session : session))
      )
    })
    void listTerminalSessions({ workspaceId: workspace.id }).then((result) => {
      if (!active || !result.ok) return
      setSessions(result.data)
      setLeftSessionId((current) => current ?? result.data[0]?.id ?? null)
      setRightSessionId((current) => current ?? result.data[1]?.id ?? result.data[0]?.id ?? null)
    })
    return () => {
      active = false
      unsubscribeExit()
    }
  }, [workspace])

  async function handleCreate(target: 'left' | 'right'): Promise<void> {
    const result = await createTerminal({ workspaceId: workspace.id, cols: 100, rows: 30 })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setSessions((current) => [result.data, ...current])
    if (target === 'left') setLeftSessionId(result.data.id)
    else setRightSessionId(result.data.id)
  }

  const left = sessions.find((session) => session.id === leftSessionId) ?? null
  const right = sessions.find((session) => session.id === rightSessionId) ?? null

  return (
    <div className="flex h-full min-h-0 flex-col">
      {error && (
        <div role="alert" className="border-b border-status-error/40 bg-status-error/10 px-3 py-2">
          <p className="text-meta text-status-error">{error}</p>
        </div>
      )}
      <PaneGroup
        id="terminal-split"
        orientation="horizontal"
        first={
          <SessionPane
            label="Pane A"
            session={left}
            sessions={sessions}
            selectedId={leftSessionId}
            onSelect={setLeftSessionId}
            onCreate={() => void handleCreate('left')}
          />
        }
        second={
          <SessionPane
            label="Pane B"
            session={right}
            sessions={sessions}
            selectedId={rightSessionId}
            onSelect={setRightSessionId}
            onCreate={() => void handleCreate('right')}
          />
        }
      />
    </div>
  )
}

function SessionPane({
  label,
  session,
  sessions,
  selectedId,
  onSelect,
  onCreate
}: {
  label: string
  session: TerminalSession | null
  sessions: TerminalSession[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-surface-raised/40 px-2 py-1">
        <select
          aria-label={`${label} session`}
          value={selectedId ?? ''}
          onChange={(event) => onSelect(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-border bg-canvas p-1 text-meta text-text-primary"
        >
          <option value="" disabled>
            {label} — select a session
          </option>
          {sessions.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.shell} ({candidate.status})
            </option>
          ))}
        </select>
        <NewSplitSessionButton id={`split-new-${label}`} onCreate={onCreate} />
      </header>
      <div className="min-h-0 flex-1">
        {session ? (
          <TerminalViewport session={session} onError={() => undefined} />
        ) : (
          <p className="p-4 text-meta text-text-tertiary">No session selected for {label}.</p>
        )}
      </div>
    </div>
  )
}

function NewSplitSessionButton({
  id,
  onCreate
}: {
  id: string
  onCreate: () => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id,
    groupId: 'terminal-workstation',
    onActivate: onCreate
  })
  return (
    <ControllerButton ref={ref} variant="ghost" onClick={onCreate}>
      + New
    </ControllerButton>
  )
}
