import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MetricValue, SystemMetricsSnapshot } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { collectSystemMetrics } from '../../services/ipc/systemClient'

interface SystemLink {
  label: string
  path: string
}

const SYSTEM_LINKS: SystemLink[] = [
  { label: 'Controller Settings', path: '/settings/controller' },
  { label: 'Display and Theme Settings', path: '/settings/display' },
  { label: 'Network and VPN', path: '/settings/network' },
  { label: 'Device and Peripheral Center', path: '/devices' },
  { label: 'Bluetooth Devices', path: '/devices/bluetooth' },
  { label: 'Audio and Microphone Center', path: '/devices/audio' },
  { label: 'Display and Dock Center', path: '/devices/display' },
  { label: 'Removable Storage Center', path: '/devices/storage' },
  { label: 'Resource Governor', path: '/resource-governor' },
  { label: 'AI Workload Scheduler', path: '/ai-workloads' },
  { label: 'Scheduler and Triggers', path: '/scheduler' },
  { label: 'Privacy and Permissions', path: '/settings/privacy' },
  { label: 'Integrations', path: '/integrations' },
  { label: 'Updates', path: '/settings/updates' },
  { label: 'Power Menu', path: '/power' },
  { label: 'About and Diagnostics', path: '/about' },
  { label: 'Recovery Timeline', path: '/recovery' },
  { label: 'Storage and Recovery', path: '/storage' },
  { label: 'Agent Operations Center', path: '/agents' },
  { label: 'Remote Systems', path: '/remote' },
  { label: 'LAN Share', path: '/lan-share' },
  { label: 'Profiles and Identity', path: '/profiles' },
  { label: 'Continuity and Offline', path: '/continuity' },
  { label: 'Secrets Vault', path: '/vault' },
  { label: 'Privacy and Data Map', path: '/privacy' },
  { label: 'Help Hub', path: '/help' },
  { label: 'Guided Troubleshooter', path: '/troubleshooter' },
  { label: 'Platform Health Overview', path: '/platform-health' },
  { label: 'Screenshot Center', path: '/screenshots' },
  { label: 'Voice Notes', path: '/voice-notes' },
  { label: 'Presentation Mode', path: '/presentation' },
  { label: 'Notification Policy', path: '/notifications' },
  { label: 'Recording Center', path: '/recording' },
  { label: 'Application Sandbox and Policy', path: '/app-policies' },
  { label: 'Kiosk Mode', path: '/kiosk' },
  { label: 'Trusted Publishers', path: '/trusted-publishers' },
  { label: 'Tool Library', path: '/tools' },
  { label: 'Steam Shortcut Manager', path: '/steam-shortcuts' },
  { label: 'Clipboard and Snippet Center', path: '/clipboard' }
]

/**
 * ND-042 System Dashboard. Uses real, capability-detected metrics from
 * SystemMetricsService and keeps unavailable hardware explicit instead of
 * fabricating values. The layout is Deck-first: inline shortcuts on 1280px
 * screens, docked tool windows only when there is room for them.
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

  if (loading && !snapshot) {
    return <p className="p-4 text-meta text-text-secondary">Collecting metrics...</p>
  }

  return (
    <div className="grid h-full min-w-0 grid-cols-1 gap-2 overflow-auto docked:grid-cols-[minmax(0,1fr)_18rem] docked-2k:grid-cols-[18rem_minmax(0,1fr)_18rem]">
      <div className="hidden min-h-0 docked-2k:block">
        <NdxToolWindow title="System Tools" subtitle={`${SYSTEM_LINKS.length} destinations`}>
          <SystemLinks onNavigate={navigate} />
        </NdxToolWindow>
      </div>

      <NdxEditorShell title="Metrics">
        <div className="flex min-h-full min-w-0 flex-col gap-4 p-3 deck:p-4">
          <div className="ndx-os-panel overflow-hidden">
            <div className="ndx-console-ruler" aria-hidden="true" />
            <div className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-meta uppercase tracking-wide text-text-tertiary">
                  System cockpit
                </p>
                <h1 className="mt-1 truncate text-title font-semibold text-text-primary">
                  System Dashboard
                </h1>
              </div>
              <ControllerButton
                variant="primary"
                disabled={loading}
                onClick={() => void handleRefresh()}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </ControllerButton>
            </div>
          </div>

          <section className="grid gap-2 deck:grid-cols-2 docked-2k:hidden">
            {SYSTEM_LINKS.slice(0, 8).map((link) => (
              <ControllerButton
                key={link.path}
                className="justify-start px-3"
                variant="secondary"
                onClick={() => navigate(link.path)}
              >
                {link.label}
              </ControllerButton>
            ))}
          </section>

          {error && <ErrorState title="System metrics error" description={error} />}

          {snapshot && (
            <>
              <p className="text-meta text-text-tertiary">
                Collected {new Date(snapshot.collectedAt).toLocaleTimeString()} on{' '}
                {snapshot.hostPlatform} - core uptime {Math.round(snapshot.core.uptimeSeconds / 60)}{' '}
                min
              </p>

              <div className="grid grid-cols-1 gap-2 deck:grid-cols-2 docked:grid-cols-3">
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
                            value={`${battery.capacityPercent ?? '?'}% - ${battery.status ?? 'unknown'}`}
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
                          value={`${sensor.celsius.toFixed(1)} C`}
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
                        value={`${iface.addressCount} address${iface.addressCount === 1 ? '' : 'es'}${iface.internal ? ' - internal' : ''}`}
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
      </NdxEditorShell>

      <div className="hidden min-h-0 docked:block">
        <NdxToolWindow
          title="Metrics Scope"
          subtitle={snapshot ? snapshot.hostPlatform : 'Awaiting collection'}
          side="right"
        >
          <MetricsScope snapshot={snapshot} />
        </NdxToolWindow>
      </div>
    </div>
  )
}

function SystemLinks({ onNavigate }: { onNavigate: (path: string) => void }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {SYSTEM_LINKS.map((link) => (
        <ControllerButton key={link.path} variant="secondary" onClick={() => onNavigate(link.path)}>
          {link.label}
        </ControllerButton>
      ))}
    </div>
  )
}

function MetricsScope({ snapshot }: { snapshot: SystemMetricsSnapshot | null }): React.JSX.Element {
  return (
    <>
      <div>
        <p className="text-meta font-semibold text-text-primary">Collection mode</p>
        <p className="text-meta text-text-tertiary">
          Manual refresh only. No background polling is started by this screen.
        </p>
      </div>
      {snapshot && (
        <div className="border-t border-border pt-3">
          <p className="text-meta font-semibold text-text-primary">Core process</p>
          <p className="text-meta text-text-secondary">PID {snapshot.core.pid}</p>
          <p className="text-meta text-text-tertiary">
            Uptime {Math.round(snapshot.core.uptimeSeconds / 60)} min
          </p>
        </div>
      )}
      <div className="border-t border-border pt-3">
        <p className="text-meta font-semibold text-text-primary">Sensor policy</p>
        <p className="text-meta text-text-tertiary">
          Unavailable battery, thermal, fan, and GPU sensors stay explicit rather than using
          fabricated values.
        </p>
      </div>
    </>
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
    <section className="ndx-os-panel flex min-w-0 flex-col gap-1 p-3">
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
    <p className="truncate text-meta text-text-secondary">
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
