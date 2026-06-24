import { useCallback, useEffect, useState } from 'react'
import type { TerminalSession } from '@shared/contracts'
import { EmptyState } from '../../components/feedback/UXState'
import {
  createTerminal,
  onTerminalData,
  terminateTerminal,
  writeTerminal
} from '../../services/ipc/terminalClient'
import { TerminalViewport } from '../terminal/TerminalViewport'

export interface LabTerminalProps {
  workspaceId: string
  relativeCwd?: string
  setupCommand?: string
  onData?: (data: string) => void
}

export function LabTerminal({
  workspaceId,
  relativeCwd,
  setupCommand,
  onData
}: LabTerminalProps): React.JSX.Element {
  const [session, setSession] = useState<TerminalSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const handleError = useCallback((message: string) => setError(message), [])

  useEffect(() => {
    let active = true
    let createdSessionId: string | null = null
    void createTerminal({ workspaceId, relativeCwd, cols: 100, rows: 20 }).then((result) => {
      if (!active) return
      setLoading(false)
      if (!result.ok) {
        setError(result.error.userMessage)
        return
      }
      createdSessionId = result.data.id
      setSession(result.data)
      if (setupCommand) {
        void writeTerminal({ sessionId: result.data.id, data: `${setupCommand}\n` })
      }
    })

    const unsubscribe = onTerminalData((event) => {
      if (event.sessionId !== createdSessionId) return
      onData?.(event.data)
    })

    return () => {
      active = false
      unsubscribe()
      if (createdSessionId) {
        void terminateTerminal({ sessionId: createdSessionId })
      }
    }
  }, [workspaceId, relativeCwd, setupCommand, onData])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-body text-text-secondary">
        Starting lab terminal…
      </div>
    )
  }

  if (error) {
    return <EmptyState title="Terminal error" description={error} />
  }

  if (!session) {
    return (
      <EmptyState
        title="Terminal unavailable"
        description="Could not start a terminal session for this lab."
      />
    )
  }

  return (
    <div className="h-full min-h-0 rounded-lg border border-border bg-canvas p-2">
      <TerminalViewport session={session} onError={handleError} />
    </div>
  )
}
