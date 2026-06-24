import { useEffect, useState } from 'react'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { getNetworkDiagnostics } from '../../services/ipc/networkClient'
import type { NetworkDiagnostics } from '@shared/contracts'

function NetworkSection({
  title,
  available,
  reason,
  children
}: {
  title: string
  available: boolean
  reason?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="space-y-2 border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <p className="text-meta font-semibold text-text-primary">{title}</p>
        {!available && <span className="text-meta text-text-tertiary">Unavailable</span>}
      </div>
      {available ? (
        children
      ) : (
        <p className="text-meta text-text-secondary">{reason ?? 'No data available.'}</p>
      )}
    </section>
  )
}

function DisabledAction({ label, reason }: { label: string; reason: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-raised/40 p-3">
      <div className="flex flex-col">
        <span className="text-body font-medium text-text-primary">{label}</span>
        <span className="text-meta text-text-secondary">{reason}</span>
      </div>
      <ControllerButton variant="secondary" disabled>
        Configure
      </ControllerButton>
    </div>
  )
}

/**
 * ND-045 Network and VPN. Read-only network diagnostics are real; VPN, Wi-Fi,
 * Ethernet, firewall, and remote-access management are honestly disabled
 * because the OS-specific adapters do not exist yet.
 */
export function NetworkAndVpn(): React.JSX.Element {
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnostics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void getNetworkDiagnostics().then((result) => {
      if (!active) return
      setLoading(false)
      if (result.ok) {
        setDiagnostics(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-meta text-text-secondary">Collecting network diagnostics…</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <header>
        <p className="text-title font-semibold text-text-primary">Network and VPN</p>
        <p className="text-body text-text-secondary">
          Read-only diagnostics are shown. Management actions are disabled until the relevant OS
          adapter is implemented.
        </p>
      </header>

      {error && <ErrorState title="Network diagnostics error" description={error} />}

      {diagnostics && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <NetworkSection
            title="Connections"
            available={diagnostics.interfaces.available}
            reason={diagnostics.interfaces.reason}
          >
            <ul className="space-y-1">
              {diagnostics.interfaces.value?.map((iface) => (
                <li key={iface.name} className="text-meta text-text-secondary">
                  {iface.name}: {iface.addressCount} address{iface.addressCount === 1 ? '' : 'es'}
                  {iface.internal ? ' · internal' : ''} · {iface.families.join(', ')}
                </li>
              ))}
            </ul>
            {diagnostics.connections.available && diagnostics.connections.value && (
              <ul className="mt-2 space-y-1">
                {diagnostics.connections.value.map((connection) => (
                  <li key={connection.name} className="text-meta text-text-secondary">
                    {connection.name}: {connection.type} · {connection.state}
                  </li>
                ))}
              </ul>
            )}
          </NetworkSection>

          <NetworkSection
            title="DNS"
            available={diagnostics.dns.available}
            reason={diagnostics.dns.reason}
          >
            <ul className="space-y-1">
              {diagnostics.dns.value?.map((server) => (
                <li key={server} className="text-meta text-text-secondary">
                  {server}
                </li>
              ))}
            </ul>
          </NetworkSection>

          <NetworkSection
            title="Proxy"
            available={diagnostics.proxy.available}
            reason={diagnostics.proxy.reason}
          >
            {diagnostics.proxy.value && (
              <ul className="space-y-1">
                {diagnostics.proxy.value.http && (
                  <li className="text-meta text-text-secondary">
                    HTTP: {diagnostics.proxy.value.http}
                  </li>
                )}
                {diagnostics.proxy.value.https && (
                  <li className="text-meta text-text-secondary">
                    HTTPS: {diagnostics.proxy.value.https}
                  </li>
                )}
                {diagnostics.proxy.value.socks && (
                  <li className="text-meta text-text-secondary">
                    SOCKS: {diagnostics.proxy.value.socks}
                  </li>
                )}
                {diagnostics.proxy.value.noProxy && (
                  <li className="text-meta text-text-secondary">
                    No proxy: {diagnostics.proxy.value.noProxy}
                  </li>
                )}
                {!diagnostics.proxy.value.http &&
                  !diagnostics.proxy.value.https &&
                  !diagnostics.proxy.value.socks && (
                    <li className="text-meta text-text-secondary">
                      No proxy environment variables set.
                    </li>
                  )}
              </ul>
            )}
          </NetworkSection>

          <section className="space-y-2 border border-border bg-surface p-3">
            <p className="text-meta font-semibold text-text-primary">Management</p>
            <DisabledAction label="Wi-Fi" reason="No Wi-Fi adapter integration exists yet." />
            <DisabledAction label="Ethernet" reason="No Ethernet adapter integration exists yet." />
            <DisabledAction
              label="VPN profiles"
              reason="OpenVPN/WireGuard adapter is not implemented yet."
            />
            <DisabledAction label="Firewall" reason="No firewall status adapter exists yet." />
            <DisabledAction
              label="Remote access"
              reason="Remote-access server is not implemented yet."
            />
          </section>
        </div>
      )}
    </div>
  )
}
