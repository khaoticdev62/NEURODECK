import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RemoteHost, RemoteSession } from '@shared/contracts'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { useFocusable } from '../../controller/focus/useFocusable'
import {
  createRemoteSession,
  listRemoteHosts,
  terminateRemoteSession
} from '../../services/ipc/remoteClient'
import {
  RemoteSessionViewport,
  type RemoteSessionViewportHandle
} from '../remote/RemoteSessionViewport'

/**
 * Universal Terminal's Remote mode — an inline host picker plus
 * `RemoteSessionViewport` (the same real connected-session viewport
 * `RemoteSession.tsx`'s standalone `/remote/:hostId` route uses), decoupled
 * from a URL `hostId` param. Deliberately not `RemoteSystems.tsx`'s private
 * `HostCard` (add/remove/test actions, out of scope here) — managing hosts
 * stays that screen's job; this panel only connects to one that already
 * exists.
 */
export function RemoteModePanel(): React.JSX.Element {
  const navigate = useNavigate()
  const [hosts, setHosts] = useState<RemoteHost[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<RemoteSession | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void listRemoteHosts().then((result) => {
      if (!active) return
      setLoading(false)
      if (result.ok) setHosts(result.data)
      else setError(result.error.userMessage)
    })
    return () => {
      active = false
    }
  }, [])

  const handleViewportError = useCallback((message: string) => setError(message), [])

  async function handleConnect(hostId: string): Promise<void> {
    setConnecting(true)
    setError(null)
    const result = await createRemoteSession({ hostId, cols: 100, rows: 30 })
    setConnecting(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setSession(result.data)
  }

  async function handleDisconnect(): Promise<void> {
    if (!session) return
    const result = await terminateRemoteSession({ sessionId: session.id })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setSession(null)
  }

  if (loading) return <p className="p-6 text-meta text-text-secondary">Loading remote hosts…</p>

  if (session) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex min-h-12 items-center justify-between border-b border-status-warning/30 bg-status-warning/5 px-3">
          <p className="truncate text-meta text-text-secondary">
            Every action here runs on the remote host, not this device.
          </p>
          <div className="flex items-center gap-2">
            <StatusBadge
              tone={session.status === 'running' ? 'success' : 'error'}
              label={session.status === 'running' ? 'Connected' : 'Disconnected'}
            />
            {session.status === 'running' && (
              <ControllerButton variant="destructive" onClick={() => void handleDisconnect()}>
                Disconnect
              </ControllerButton>
            )}
          </div>
        </header>
        {error && <ErrorState title="Remote session error" description={error} />}
        <div className="min-h-0 flex-1">
          <RemoteSessionViewport session={session} onError={handleViewportError} />
        </div>
      </div>
    )
  }

  if (hosts.length === 0) {
    return (
      <EmptyState
        title="No remote hosts"
        description="Add an SSH host in Remote Systems before connecting from here."
        action={
          <ControllerButton variant="primary" onClick={() => navigate('/remote')}>
            Open Remote Systems
          </ControllerButton>
        }
      />
    )
  }

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      {error && <ErrorState title="Remote connection error" description={error} />}
      <p className="text-meta text-text-tertiary">Choose a host to connect from this screen.</p>
      <ul className="flex flex-col gap-2">
        {hosts.map((host) => (
          <HostRow
            key={host.id}
            host={host}
            disabled={connecting}
            onConnect={() => void handleConnect(host.id)}
          />
        ))}
      </ul>
    </div>
  )
}

function HostRow({
  host,
  disabled,
  onConnect
}: {
  host: RemoteHost
  disabled: boolean
  onConnect: () => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `terminal-remote-host-${host.id}`,
    groupId: 'terminal-workstation',
    disabled,
    onActivate: onConnect
  })
  return (
    <li>
      <ControllerButton
        ref={ref}
        variant="secondary"
        className="w-full justify-between"
        disabled={disabled}
        onClick={onConnect}
      >
        <span>{host.name}</span>
        <span className="text-meta text-text-tertiary">
          {host.username}@{host.hostname}:{host.port}
        </span>
      </ControllerButton>
    </li>
  )
}

export type { RemoteSessionViewportHandle }
