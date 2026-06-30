import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LanShareHealth, LanShareIdentity, LanShareServiceStatus } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import {
  getLanShareHealth,
  getLanShareIdentity,
  getLanShareServiceStatus,
  onLanShareServiceUpdate,
  startLanShareService,
  stopLanShareService
} from '../../services/ipc/lanShareClient'

const SUB_LINKS = [
  { label: 'Nearby Devices', path: '/lan-share/peers' },
  { label: 'Send Files', path: '/lan-share/send' },
  { label: 'Transfers', path: '/lan-share/transfers' },
  { label: 'Settings', path: '/lan-share/settings' }
]

/**
 * ND-LAN-001 LAN Share Home. Real service start/stop, real identity, and
 * real health (bound sockets, writable receive directory, interface
 * count) — no fabricated diagnostics. Connectivity Diagnostics
 * (ND-LAN-019), Firewall Assistant (ND-LAN-018), and Compatibility
 * Detail (ND-LAN-020) are honestly folded out of this pass: there is no
 * real firewall probe, route-table read, or protocol-version matrix
 * behind them yet (see the implementation ledger).
 */
export function LanShareHome(): React.JSX.Element {
  const navigate = useNavigate()
  const [identity, setIdentity] = useState<LanShareIdentity | null>(null)
  const [status, setStatus] = useState<LanShareServiceStatus | null>(null)
  const [health, setHealth] = useState<LanShareHealth | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh(): Promise<void> {
    const [identityResult, statusResult, healthResult] = await Promise.all([
      getLanShareIdentity(),
      getLanShareServiceStatus(),
      getLanShareHealth()
    ])
    if (identityResult.ok) setIdentity(identityResult.data)
    if (statusResult.ok) setStatus(statusResult.data)
    if (healthResult.ok) setHealth(healthResult.data)
    if (!identityResult.ok) setError(identityResult.error.userMessage)
    else if (!statusResult.ok) setError(statusResult.error.userMessage)
    else if (!healthResult.ok) setError(healthResult.error.userMessage)
    else setError(null)
  }

  useEffect(() => {
    let active = true
    void Promise.all([getLanShareIdentity(), getLanShareServiceStatus(), getLanShareHealth()]).then(
      ([identityResult, statusResult, healthResult]) => {
        if (!active) return
        if (identityResult.ok) setIdentity(identityResult.data)
        if (statusResult.ok) setStatus(statusResult.data)
        if (healthResult.ok) setHealth(healthResult.data)
        if (!identityResult.ok) setError(identityResult.error.userMessage)
        else if (!statusResult.ok) setError(statusResult.error.userMessage)
        else if (!healthResult.ok) setError(healthResult.error.userMessage)
      }
    )
    const unsubscribe = onLanShareServiceUpdate((next) => {
      if (active) setStatus(next)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  async function handleToggleService(): Promise<void> {
    setBusy(true)
    const result =
      status?.state === 'running' ? await stopLanShareService() : await startLanShareService()
    setBusy(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setStatus(result.data)
    void refresh()
  }

  const isRunning = status?.state === 'running'

  return (
    <div className="grid h-full min-w-[76rem] grid-cols-[20rem_minmax(40rem,1fr)_18rem] gap-2 overflow-auto">
      <NdxToolWindow title="LAN Share Service" subtitle={status?.state ?? 'Loading'}>
        <div className="space-y-3 text-meta text-text-secondary">
          <p>
            Service start, stop, identity, and socket health come from the real LAN Share service.
          </p>
          {identity && <p>Connect ID: {identity.connectId}</p>}
        </div>
      </NdxToolWindow>

      <NdxEditorShell title="LAN Share Control">
        <div className="flex min-h-full min-w-0 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <p className="text-title font-semibold text-text-primary">LAN Share</p>
            <ControllerButton
              variant={isRunning ? 'destructive' : 'primary'}
              disabled={busy || status?.state === 'starting'}
              onClick={() => void handleToggleService()}
            >
              {busy ? 'Working…' : isRunning ? 'Stop service' : 'Start service'}
            </ControllerButton>
          </div>

          {error && <ErrorState title="LAN Share error" description={error} />}

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Service status</p>
            <p className="text-meta text-text-secondary">
              {status ? `${status.state} — ${status.reason}` : 'Loading…'}
            </p>
            {identity && (
              <p className="text-meta text-text-tertiary">
                {identity.displayName} · connect id {identity.connectId}
              </p>
            )}
            {health && (
              <p className="text-meta text-text-tertiary">
                Transfer port {health.transferPortBound ? 'bound' : 'not bound'} · Registration port{' '}
                {health.authPortBound ? 'bound' : 'not bound'} · Receive directory{' '}
                {health.receiveDirectoryWritable ? 'writable' : 'not writable'} ·{' '}
                {health.interfaceCount} network interface{health.interfaceCount === 1 ? '' : 's'}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-body font-semibold text-text-primary">Go to</p>
            <div className="flex flex-wrap gap-2">
              {SUB_LINKS.map((link) => (
                <ControllerButton
                  key={link.path}
                  variant="secondary"
                  onClick={() => navigate(link.path)}
                >
                  {link.label}
                </ControllerButton>
              ))}
            </div>
          </section>
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Network Policy" subtitle="Real sockets" side="right">
        <div className="space-y-3 text-meta text-text-secondary">
          <p>
            Firewall probing and compatibility matrices remain deferred until real probes exist.
          </p>
          <p>Receive directory writability and interface counts are reported by the service.</p>
        </div>
      </NdxToolWindow>
    </div>
  )
}
