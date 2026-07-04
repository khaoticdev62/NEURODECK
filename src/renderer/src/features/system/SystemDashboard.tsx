import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MetricValue, SystemMetricsSnapshot } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { formatBytes } from '../../components/primitives/formatBytes'
import { NdxMeter } from '../../components/primitives/NdxMeter'
import { ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { NdxTvCard, NdxTvShelf, TvCategoryIcon } from '../../components/tvos'
import { collectSystemMetrics } from '../../services/ipc/systemClient'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'

interface SystemLink {
  label: string
  path: string
  category: string
}

/**
 * Phase 2 tvOS condensation (see plan): the flat list this screen used to
 * render as two special-cased views (an 8-item deck slice and a
 * docked-2k-only tool window) is grouped into named categories and shown as
 * horizontally scrolling shelves instead, on every breakpoint. Every link
 * below is unchanged — none were dropped — only their presentation and
 * grouping changed.
 */
const SYSTEM_LINKS: SystemLink[] = [
  { label: 'Controller Settings', path: '/settings/controller', category: 'Display & Controller' },
  {
    label: 'Display and Theme Settings',
    path: '/settings/display',
    category: 'Display & Controller'
  },
  { label: 'Device and Peripheral Center', path: '/devices', category: 'Devices' },
  { label: 'Bluetooth Devices', path: '/devices/bluetooth', category: 'Devices' },
  { label: 'Audio and Microphone Center', path: '/devices/audio', category: 'Devices' },
  { label: 'Display and Dock Center', path: '/devices/display', category: 'Devices' },
  { label: 'Removable Storage Center', path: '/devices/storage', category: 'Devices' },
  { label: 'Resource Governor', path: '/resource-governor', category: 'AI & Automation' },
  { label: 'AI Workload Scheduler', path: '/ai-workloads', category: 'AI & Automation' },
  { label: 'Scheduler and Triggers', path: '/scheduler', category: 'AI & Automation' },
  { label: 'Agent Operations Center', path: '/agents', category: 'AI & Automation' },
  { label: 'AI Command Canvas', path: '/ai', category: 'AI & Automation' },
  { label: 'Tool Library', path: '/tools', category: 'AI & Automation' },
  { label: 'Prompt and Persona Library', path: '/prompt-library', category: 'AI & Automation' },
  { label: 'AI Memory Control Center', path: '/memory', category: 'AI & Automation' },
  { label: 'Network and VPN', path: '/settings/network', category: 'Network & Sharing' },
  { label: 'Integrations', path: '/integrations', category: 'Network & Sharing' },
  { label: 'Remote Systems', path: '/remote', category: 'Network & Sharing' },
  { label: 'LAN Share', path: '/lan-share', category: 'Network & Sharing' },
  { label: 'Privacy and Permissions', path: '/settings/privacy', category: 'Privacy & Security' },
  { label: 'Secrets Vault', path: '/vault', category: 'Privacy & Security' },
  { label: 'Privacy and Data Map', path: '/privacy', category: 'Privacy & Security' },
  { label: 'Kiosk Mode', path: '/kiosk', category: 'Privacy & Security' },
  { label: 'Trusted Publishers', path: '/trusted-publishers', category: 'Privacy & Security' },
  { label: 'Updates', path: '/settings/updates', category: 'System Health' },
  { label: 'About and Diagnostics', path: '/about', category: 'System Health' },
  { label: 'Recovery Timeline', path: '/recovery', category: 'System Health' },
  { label: 'Storage and Recovery', path: '/storage', category: 'System Health' },
  { label: 'Platform Health Overview', path: '/platform-health', category: 'System Health' },
  { label: 'Power Menu', path: '/power', category: 'Session & Power' },
  { label: 'Profiles and Identity', path: '/profiles', category: 'Session & Power' },
  { label: 'Continuity and Offline', path: '/continuity', category: 'Session & Power' },
  { label: 'Notification Policy', path: '/notifications', category: 'Session & Power' },
  { label: 'Help Hub', path: '/help', category: 'Help & Support' },
  { label: 'Guided Troubleshooter', path: '/troubleshooter', category: 'Help & Support' },
  { label: 'Screenshot Center', path: '/screenshots', category: 'Media & Capture' },
  { label: 'Voice Notes', path: '/voice-notes', category: 'Media & Capture' },
  { label: 'Presentation Mode', path: '/presentation', category: 'Media & Capture' },
  { label: 'Recording Center', path: '/recording', category: 'Media & Capture' },
  { label: 'Application Center', path: '/applications', category: 'Apps & Extensions' },
  { label: 'Application Sandbox and Policy', path: '/app-policies', category: 'Apps & Extensions' },
  { label: 'Steam Shortcut Manager', path: '/steam-shortcuts', category: 'Apps & Extensions' },
  { label: 'Clipboard and Snippet Center', path: '/clipboard', category: 'Apps & Extensions' }
]

const SYSTEM_LINK_CATEGORIES: string[] = [...new Set(SYSTEM_LINKS.map((link) => link.category))]

/**
 * ND-042 System Dashboard. Uses real, capability-detected metrics from
 * SystemMetricsService and keeps unavailable hardware explicit instead of
 * fabricating values. Navigation to the other system/settings screens is
 * grouped into categorized tvOS-style shelves (Phase 2), rendered the same
 * way at every breakpoint; the docked "Metrics Scope" tool window is
 * unrelated real content (collection-mode/sensor-policy notes), not a
 * navigation list, so it keeps its own docked-only treatment.
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

  const setSecondary = useWorkbenchStore((state) => state.setSecondary)

  useEffect(() => {
    setSecondary(
      <NdxToolWindow
        title="Metrics Scope"
        subtitle={snapshot ? snapshot.hostPlatform : 'Awaiting collection'}
        side="right"
      >
        <MetricsScope snapshot={snapshot} />
      </NdxToolWindow>
    )
    return () => setSecondary(null)
  }, [snapshot, setSecondary])

  if (loading && !snapshot) {
    return <p className="p-4 text-meta text-text-secondary">Collecting metrics...</p>
  }

  return (
    <div className="h-full flex-1">
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

          <div className="flex flex-col gap-4">
            {SYSTEM_LINK_CATEGORIES.map((category) => (
              <NdxTvShelf
                key={category}
                title={category}
                icon={<TvCategoryIcon category={category} />}
              >
                {SYSTEM_LINKS.filter((link) => link.category === category).map((link) => (
                  <NdxTvCard
                    key={link.path}
                    id={`system-link:${link.path}`}
                    groupId="system-dashboard-links"
                    title={link.label}
                    onActivate={() => navigate(link.path)}
                  />
                ))}
              </NdxTvShelf>
            ))}
          </div>

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
                      <NdxMeter label="Usage" percent={cpu.usagePercent} />
                      <Stat label="Logical cores" value={String(cpu.logicalCores)} />
                      <Stat label="Model" value={cpu.model} />
                    </>
                  )}
                </MetricCard>

                <MetricCard title="Memory" metric={snapshot.memory}>
                  {(memory) => (
                    <>
                      <NdxMeter
                        label="Usage"
                        percent={memory.usagePercent}
                        displayValue={`${formatBytes(memory.usedBytes)} / ${formatBytes(memory.totalBytes)}`}
                      />
                    </>
                  )}
                </MetricCard>

                <MetricCard title="Swap" metric={snapshot.swap}>
                  {(swap) => (
                    <>
                      <NdxMeter
                        label="Usage"
                        percent={swap.usagePercent}
                        displayValue={`${formatBytes(swap.usedBytes)} / ${formatBytes(swap.totalBytes)}`}
                      />
                    </>
                  )}
                </MetricCard>

                <MetricCard title="Storage" metric={snapshot.storage}>
                  {(storage) => (
                    <>
                      <Stat label="Path" value={storage.path} />
                      <NdxMeter
                        label="Usage"
                        percent={storage.usagePercent}
                        displayValue={`${storage.usagePercent.toFixed(1)}% - ${formatBytes(storage.availableBytes)} free`}
                      />
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
                        <NdxMeter
                          key={device.device}
                          label={device.device}
                          percent={device.usagePercent}
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
