import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { RemoteHost, RemoteSession as RemoteSessionType } from '@shared/contracts'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import {
  createRemoteSession,
  listRemoteHosts,
  terminateRemoteSession
} from '../../services/ipc/remoteClient'
import { RemoteSessionViewport } from './RemoteSessionViewport'

/**
 * ND-041 Remote Session, scoped to Terminal mode only — Files, Metrics,
 * Services, Logs, Port forwarding, and Remote desktop launch each need
 * their own real protocol support (SFTP, a remote metrics agent, a
 * service-manager integration, log tailing, a tunnel manager, RDP/VNC)
 * that this slice doesn't build. The safety requirements that do apply
 * here are real: the host identity banner is always visible, and
 * terminating a session is a single explicit action — there is no
 * destructive in-session command this screen itself can send.
 */
export function RemoteSession(): React.JSX.Element {
  const { hostId } = useParams<{ hostId: string }>()
  const navigate = useNavigate()
  const [host, setHost] = useState<RemoteHost | null>(null)
  const [session, setSession] = useState<RemoteSessionType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(true)

  const handleViewportError = useCallback((message: string) => setError(message), [])

  useEffect(() => {
    if (!hostId) return
    let active = true
    void listRemoteHosts().then(async (hostsResult) => {
      if (!active) return
      if (!hostsResult.ok) {
        setError(hostsResult.error.userMessage)
        setConnecting(false)
        return
      }
      const matched = hostsResult.data.find((candidate) => candidate.id === hostId) ?? null
      setHost(matched)
      if (!matched) {
        setConnecting(false)
        return
      }
      const sessionResult = await createRemoteSession({ hostId, cols: 100, rows: 30 })
      if (!active) return
      setConnecting(false)
      if (!sessionResult.ok) {
        setError(sessionResult.error.userMessage)
        return
      }
      setSession(sessionResult.data)
      if (sessionResult.data.status === 'error' && sessionResult.data.errorMessage) {
        setError(sessionResult.data.errorMessage)
      }
    })
    return () => {
      active = false
    }
  }, [hostId])

  async function handleDisconnect(): Promise<void> {
    if (!session) return
    const result = await terminateRemoteSession({ sessionId: session.id })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    navigate('/remote')
  }

  if (!hostId) {
    return <EmptyState title="No host selected" description="Open a host from Remote Systems." />
  }

  if (connecting) {
    return <p className="p-6 text-meta text-text-secondary">Connecting…</p>
  }

  if (!host) {
    return (
      <EmptyState
        title="Host not found"
        description="This remote host no longer exists."
        action={
          <ControllerButton variant="primary" onClick={() => navigate('/remote')}>
            Back to Remote Systems
          </ControllerButton>
        }
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col border border-border bg-surface">
      <header className="flex min-h-12 items-center justify-between border-b border-status-warning/30 bg-status-warning/5 px-3">
        <div className="min-w-0">
          <p className="truncate text-meta font-semibold text-text-primary">
            Remote session · {host.username}@{host.hostname}
          </p>
          <p className="text-meta text-text-tertiary">
            Every action here runs on the remote host, not this device.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <StatusBadge
              tone={
                session.status === 'running'
                  ? 'success'
                  : session.status === 'connecting'
                    ? 'neutral'
                    : 'error'
              }
              label={
                session.status === 'running'
                  ? 'Connected'
                  : session.status === 'connecting'
                    ? 'Connecting'
                    : session.status === 'exited'
                      ? 'Disconnected'
                      : 'Connection error'
              }
            />
          )}
          {session?.status === 'running' && (
            <ControllerButton variant="destructive" onClick={() => void handleDisconnect()}>
              Disconnect
            </ControllerButton>
          )}
        </div>
      </header>

      {error && <ErrorState title="Remote session error" description={error} />}

      <div className="min-h-0 flex-1">
        {session && session.status !== 'error' ? (
          <RemoteSessionViewport session={session} onError={handleViewportError} />
        ) : (
          !error && <p className="p-6 text-meta text-text-secondary">Establishing connection…</p>
        )}
      </div>
    </div>
  )
}
