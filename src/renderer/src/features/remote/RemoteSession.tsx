import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { RemoteHost, RemoteSession as RemoteSessionType } from '@shared/contracts'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import {
  createRemoteSession,
  listRemoteHosts,
  terminateRemoteSession
} from '../../services/ipc/remoteClient'
import { RemoteSessionViewport, type RemoteSessionViewportHandle } from './RemoteSessionViewport'

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
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFound, setSearchFound] = useState<boolean | null>(null)
  const viewportRef = useRef<RemoteSessionViewportHandle>(null)

  const handleViewportError = useCallback((message: string) => setError(message), [])

  function handleFind(direction: 'next' | 'previous'): void {
    if (!searchQuery.trim()) return
    const found =
      direction === 'next'
        ? viewportRef.current?.findNext(searchQuery)
        : viewportRef.current?.findPrevious(searchQuery)
    setSearchFound(found ?? false)
  }

  function handleCopySelection(): void {
    viewportRef.current?.copySelection()
  }

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
    <div className="grid h-full min-w-[64rem] grid-cols-[22rem_minmax(32rem,1fr)] gap-2 overflow-auto">
      <NdxToolWindow title="Remote Host" subtitle={`${host.username}@${host.hostname}`}>
        <div className="flex flex-col gap-3 border border-status-warning/30 bg-status-warning/5 p-3">
          <div className="min-w-0">
            <p className="truncate text-meta font-semibold text-text-primary">
              Remote session · {host.username}@{host.hostname}
            </p>
            <p className="text-meta text-text-tertiary">
              Every action here runs on the remote host, not this device.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {session?.status === 'running' && (
              <>
                <ControllerButton
                  variant="ghost"
                  onClick={() => {
                    setSearchOpen((current) => !current)
                    setSearchFound(null)
                  }}
                >
                  Find
                </ControllerButton>
                <ControllerButton variant="ghost" onClick={handleCopySelection}>
                  Copy selection
                </ControllerButton>
              </>
            )}
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
        </div>
      </NdxToolWindow>

      <NdxEditorShell title={host.name}>
        {searchOpen && (
          <div className="flex items-center gap-2 border-b border-border bg-surface-raised/40 px-3 py-2">
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setSearchFound(null)
              }}
              placeholder="Search scrollback"
              className="min-w-0 flex-1 rounded-md border border-border bg-canvas p-1.5 text-meta text-text-primary"
            />
            <ControllerButton variant="ghost" onClick={() => handleFind('previous')}>
              Previous
            </ControllerButton>
            <ControllerButton variant="ghost" onClick={() => handleFind('next')}>
              Next
            </ControllerButton>
            {searchFound === false && (
              <span className="text-meta text-status-warning">No matches</span>
            )}
          </div>
        )}

        {error && <ErrorState title="Remote session error" description={error} />}

        <div className="h-full min-h-0">
          {session && session.status !== 'error' ? (
            <RemoteSessionViewport
              ref={viewportRef}
              session={session}
              onError={handleViewportError}
            />
          ) : (
            !error && <p className="p-6 text-meta text-text-secondary">Establishing connection…</p>
          )}
        </div>
      </NdxEditorShell>
    </div>
  )
}
