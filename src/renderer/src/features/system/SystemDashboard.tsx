import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MetricValue, SystemMetricsSnapshot } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { collectSystemMetrics } from '../../services/ipc/systemClient'

interface SystemLink {
  label: string
  path: string
}

/**
 * The Primary Navigation Rail (wireframe §6.2) has exactly 11 destinations,
 * and "System" is the only one of them that owns this whole area — every
 * other real System/Settings screen (Controller Settings, Display and
 * Theme, Privacy and Permissions, Power Menu, About and Diagnostics,
 * Recovery, Storage) and Agent Operations Center (no primary-rail
 * destination of its own; grouped with Workflows per the spec's staging
 * plan) had no navigation path to them at all before this — real, built,
 * working screens that were simply unreachable through the UI. This list
 * is that missing entry point.
 */
const SYSTEM_LINKS: SystemLink[] = [
  { label: 'Controller Settings', path: '/settings/controller' },
  { label: 'Display and Theme Settings', path: '/settings/display' },
  { label: 'Network and VPN', path: '/settings/network' },
  { label: 'Device and Peripheral Center', path: '/devices' },
  { label: 'Privacy and Permissions', path: '/settings/privacy' },
  { label: 'Integrations', path: '/integrations' },
  { label: 'Updates', path: '/settings/updates' },
  { label: 'Power Menu', path: '/power' },
  { label: 'About and Diagnostics', path: '/about' },
  { label: 'Recovery Timeline', path: '/recovery' },
  { label: 'Storage and Recovery', path: '/storage' },
  { label: 'Agent Operations Center', path: '/agents' },
  { label: 'Remote Systems', path: '/remote' }
]

/**
 * ND-042 System Dashboard. Real, capability-detected metrics from
 * `SystemMetricsService` — CPU/memory/swap/storage/network/process always
 * attempt collection; battery/thermal/fan/GPU are Linux-only and report
 * honestly as unavailable elsewhere (a desktop with no battery, a non-Linux
 * host) rather than showing a fabricated value. No auto-refresh polling in
 * this slice — a manual Refresh keeps the no-background-surprises rule
 * simple to reason about; revisit if a live-updating view becomes a real
 * requirement.
 */
export function SystemDashboard(): React.JSX.Element {
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<SystemMetricsSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void collectSystemMetrics().then((result) => {
      if (!active) return
      setLoading(false)
      if (result.ok) {
        setSnapshot(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [])

  async function handleRefresh(): Promise<void> {
    setLoading(true)
    const result = await collectSystemMetrics()
    setLoading(false)
    if (result.ok) {
      setSnapshot(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  if (loading && !snapshot)
    return <p className="p-4 text-meta text-text-secondary">Collecting metrics…</p>

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between">
        <p className="text-title font-semibold text-text-primary">System Dashboard</p>
        <ControllerButton variant="primary" disabled={loading} onClick={() => void handleRefresh()}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </ControllerButton>
      </div>

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Settings and tools</p>
        <div className="flex flex-wrap gap-2">
          {SYSTEM_LINKS.map((link) => (
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

      {error && <ErrorState title="System metrics error" description={error} />}

      {snapshot && (
        <>
          <p className="text-meta text-text-tertiary">
            Collected {new Date(snapshot.collectedAt).toLocaleTimeString()} on{' '}
            {snapshot.hostPlatform} · core uptime {Math.round(snapshot.core.uptimeSeconds / 60)} min
          </p>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <MetricCard title="CPU" metric={snapshot.cpu}>
              {(cpu) => (
                <>
                  <Stat label="Usage" value={`${cpu.usagePercent.toFixed(1)}%`} />
                  <Stat label="Logical cores" value={String(cpu.logicalCores)} />
                  <Stat label="Model" value={cpu.model} />
                </>
              )}
            </MetricCard>

            <MetricCard title="Memory" metric={snapshot.memory}>
              {(memory) => (
                <>
                  <Stat label="Usage" value={`${memory.usagePercent.toFixed(1)}%`} />
                  <Stat label="Used" value={formatBytes(memory.usedBytes)} />
                  <Stat label="Total" value={formatBytes(memory.totalBytes)} />
                </>
              )}
            </MetricCard>

            <MetricCard title="Swap" metric={snapshot.swap}>
              {(swap) => (
                <>
                  <Stat label="Usage" value={`${swap.usagePercent.toFixed(1)}%`} />
                  <Stat label="Used" value={formatBytes(swap.usedBytes)} />
                  <Stat label="Total" value={formatBytes(swap.totalBytes)} />
                </>
              )}
            </MetricCard>

            <MetricCard title="Storage" metric={snapshot.storage}>
              {(storage) => (
                <>
                  <Stat label="Path" value={storage.path} />
                  <Stat label="Usage" value={`${storage.usagePercent.toFixed(1)}%`} />
                  <Stat label="Available" value={formatBytes(storage.availableBytes)} />
                </>
              )}
            </MetricCard>

            <MetricCard title="Battery" metric={snapshot.battery}>
              {(batteries) =>
                batteries.length === 0 ? (
                  <p className="text-meta text-text-tertiary">No battery device.</p>
                ) : (
                  batteries.map((battery) => (
                    <div key={battery.name} className="mb-1">
                      <Stat
                        label={battery.name}
                        value={`${battery.capacityPercent ?? '?'}% · ${battery.status ?? 'unknown'}`}
                      />
                    </div>
                  ))
                )
              }
            </MetricCard>

            <MetricCard title="Thermal" metric={snapshot.thermal}>
              {(sensors) =>
                sensors.length === 0 ? (
                  <p className="text-meta text-text-tertiary">No thermal sensors.</p>
                ) : (
                  sensors.map((sensor) => (
                    <Stat
                      key={sensor.name}
                      label={sensor.name}
                      value={`${sensor.celsius.toFixed(1)}°C`}
                    />
                  ))
                )
              }
            </MetricCard>

            <MetricCard title="Fans" metric={snapshot.fans}>
              {(fans) =>
                fans.length === 0 ? (
                  <p className="text-meta text-text-tertiary">No fan sensors.</p>
                ) : (
                  fans.map((fan) => (
                    <Stat key={fan.name} label={fan.name} value={`${fan.rpm} rpm`} />
                  ))
                )
              }
            </MetricCard>

            <MetricCard title="GPU" metric={snapshot.gpu}>
              {(devices) =>
                devices.length === 0 ? (
                  <p className="text-meta text-text-tertiary">No supported GPU usage sensor.</p>
                ) : (
                  devices.map((device) => (
                    <Stat
                      key={device.device}
                      label={device.device}
                      value={`${device.usagePercent.toFixed(1)}%`}
                    />
                  ))
                )
              }
            </MetricCard>

            <MetricCard title="Network" metric={snapshot.network}>
              {(interfaces) =>
                interfaces.map((iface) => (
                  <Stat
                    key={iface.name}
                    label={iface.name}
                    value={`${iface.addressCount} address${iface.addressCount === 1 ? '' : 'es'}${iface.internal ? ' · internal' : ''}`}
                  />
                ))
              }
            </MetricCard>

            <MetricCard title="Processes" metric={snapshot.processes}>
              {(processes) => <Stat label="Count" value={String(processes.length)} />}
            </MetricCard>
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard<T>({
  title,
  metric,
  children
}: {
  title: string
  metric: MetricValue<T>
  children: (value: T) => React.ReactNode
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-1 border border-border bg-surface p-3">
      <p className="text-body font-semibold text-text-primary">{title}</p>
      {metric.available && metric.value !== undefined ? (
        children(metric.value)
      ) : (
        <p className="text-meta text-text-tertiary">
          Unavailable: {metric.reason ?? 'no reason reported'}
        </p>
      )}
      <p className="text-meta text-text-tertiary">Source: {metric.source}</p>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <p className="text-meta text-text-secondary">
      {label}: <span className="text-text-primary">{value}</span>
    </p>
  )
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log2(bytes) / 10), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(1)} ${units[exponent]}`
}
