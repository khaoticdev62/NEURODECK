import { useEffect, useState } from 'react'
import type { MetricValue, SystemMetricsSnapshot } from '@shared/contracts'
import { ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { collectSystemMetrics } from '../../services/ipc/systemClient'

const GOVERNOR_PROFILES = [
  { label: 'Performance', status: 'not enforced', reason: 'No resource policy engine exists yet.' },
  { label: 'Balanced', status: 'observed', reason: 'Current screen only reports live metrics.' },
  {
    label: 'Battery Saver',
    status: 'not enforced',
    reason: 'No battery-aware admission controller exists yet.'
  },
  { label: 'Quiet', status: 'not enforced', reason: 'No interruption or fan policy is wired yet.' },
  {
    label: 'Game Priority',
    status: 'not enforced',
    reason: 'No SteamOS foreground-game detector is implemented yet.'
  },
  {
    label: 'AI Workstation',
    status: 'not enforced',
    reason: 'No model/load scheduler can reserve resources yet.'
  }
]

export function ResourceGovernor(): React.JSX.Element {
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
    return <p className="p-4 text-meta text-text-secondary">Measuring resource state...</p>

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-title font-semibold text-text-primary">Resource Governor</p>
          <p className="text-meta text-text-secondary">
            Read-only policy dashboard from live system metrics.
          </p>
        </div>
        <ControllerButton variant="primary" disabled={loading} onClick={() => void handleRefresh()}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </ControllerButton>
      </div>

      {error && <ErrorState title="Resource metrics error" description={error} />}

      {snapshot && (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <MetricSummary
              title="CPU"
              metric={snapshot.cpu}
              value={(cpu) => `${cpu.usagePercent.toFixed(1)}%`}
            />
            <MetricSummary
              title="Memory"
              metric={snapshot.memory}
              value={(memory) => `${memory.usagePercent.toFixed(1)}%`}
            />
            <MetricSummary
              title="Storage"
              metric={snapshot.storage}
              value={(storage) => `${storage.usagePercent.toFixed(1)}%`}
            />
            <MetricSummary
              title="Battery"
              metric={snapshot.battery}
              value={(batteries) =>
                batteries[0]?.capacityPercent === null || batteries.length === 0
                  ? 'Unknown'
                  : `${batteries[0].capacityPercent}%`
              }
            />
            <MetricSummary
              title="Thermal"
              metric={snapshot.thermal}
              value={(sensors) =>
                sensors.length === 0 ? 'Unavailable' : `${sensors[0].celsius.toFixed(1)}C`
              }
            />
            <MetricSummary
              title="GPU"
              metric={snapshot.gpu}
              value={(devices) =>
                devices.length === 0 ? 'Unavailable' : `${devices[0].usagePercent.toFixed(1)}%`
              }
            />
          </section>

          <section className="border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Profiles</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {GOVERNOR_PROFILES.map((profile) => (
                <div
                  key={profile.label}
                  className="flex items-start justify-between gap-3 border border-border bg-surface-raised p-2"
                >
                  <div>
                    <p className="text-meta font-semibold text-text-primary">{profile.label}</p>
                    <p className="text-caption text-text-tertiary">{profile.reason}</p>
                  </div>
                  <StatusBadge
                    tone={profile.status === 'observed' ? 'info' : 'neutral'}
                    label={profile.status}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Policy actions</p>
            <p className="text-meta text-text-secondary">
              Delay model load, reduce context, pause downloads, suspend browser tabs, delay
              backups, and unload inactive models are not wired because no resource policy engine
              can enforce or reverse those actions yet.
            </p>
          </section>
        </>
      )}
    </div>
  )
}

function MetricSummary<T>({
  title,
  metric,
  value
}: {
  title: string
  metric: MetricValue<T>
  value: (input: T) => string
}): React.JSX.Element {
  return (
    <section className="border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption uppercase text-text-tertiary">{title}</p>
        <StatusBadge
          tone={metric.available ? toneForMetric(title, metric) : 'neutral'}
          label={metric.available ? 'observed' : 'unavailable'}
        />
      </div>
      <p className="mt-1 text-title font-semibold text-text-primary">
        {metric.available && metric.value !== undefined ? value(metric.value) : 'Unavailable'}
      </p>
      {!metric.available && (
        <p className="text-caption text-text-tertiary">{metric.reason ?? 'No reason reported.'}</p>
      )}
    </section>
  )
}

function toneForMetric<T>(title: string, metric: MetricValue<T>): StatusTone {
  const metricValue = metric.value
  if (!metric.available || metricValue === undefined || metricValue === null) return 'neutral'
  if (title === 'CPU' && typeof metricValue === 'object' && 'usagePercent' in metricValue) {
    return Number(metricValue.usagePercent) > 85 ? 'warning' : 'success'
  }
  if (title === 'Memory' && typeof metricValue === 'object' && 'usagePercent' in metricValue) {
    return Number(metricValue.usagePercent) > 85 ? 'warning' : 'success'
  }
  return 'info'
}
