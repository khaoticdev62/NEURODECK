import { useEffect, useState } from 'react'
import type { SystemMetricsSnapshot } from '@shared/contracts'
import { ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { collectSystemMetrics } from '../../services/ipc/systemClient'

const JOB_CLASSES = [
  'Interactive inference',
  'Background inference',
  'Embedding',
  'Indexing',
  'Model download',
  'Model load',
  'Model conversion',
  'Speech recognition',
  'Text-to-speech',
  'Vision analysis',
  'Agent task',
  'Workflow AI node'
]

const SCHEDULING_FACTORS = [
  'Foreground priority',
  'Deadline',
  'Battery',
  'Thermal',
  'Available memory',
  'Model residency',
  'Provider rate limits',
  'Network cost',
  'User profile',
  'Privacy requirement'
]

export function AIWorkloadScheduler(): React.JSX.Element {
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
    return <p className="p-4 text-meta text-text-secondary">Checking workload capacity...</p>

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-title font-semibold text-text-primary">AI Workload Scheduler</p>
          <p className="text-meta text-text-secondary">
            Admission signals for AI work; queue enforcement is not built yet.
          </p>
        </div>
        <ControllerButton variant="primary" disabled={loading} onClick={() => void handleRefresh()}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </ControllerButton>
      </div>

      {error && <ErrorState title="Workload scheduler error" description={error} />}

      {snapshot && (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <CapacityCard
              label="Memory headroom"
              value={`${snapshot.memory.value?.usagePercent.toFixed(1) ?? '?'}% used`}
              healthy={
                snapshot.memory.available && (snapshot.memory.value?.usagePercent ?? 100) < 85
              }
            />
            <CapacityCard
              label="Thermal"
              value={
                snapshot.thermal.available && snapshot.thermal.value?.[0]
                  ? `${snapshot.thermal.value[0].celsius.toFixed(1)}C`
                  : 'Unavailable'
              }
              healthy={
                !snapshot.thermal.available || (snapshot.thermal.value?.[0]?.celsius ?? 0) < 80
              }
            />
            <CapacityCard
              label="Battery"
              value={
                snapshot.battery.available && snapshot.battery.value?.[0]?.capacityPercent !== null
                  ? `${snapshot.battery.value?.[0]?.capacityPercent ?? '?'}%`
                  : 'Unavailable'
              }
              healthy={
                !snapshot.battery.available ||
                (snapshot.battery.value?.[0]?.capacityPercent ?? 100) > 25
              }
            />
          </section>

          <section className="border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Job classes</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {JOB_CLASSES.map((jobClass) => (
                <div
                  key={jobClass}
                  className="flex items-start justify-between gap-3 border border-border bg-surface-raised p-2"
                >
                  <p className="text-meta font-semibold text-text-primary">{jobClass}</p>
                  <StatusBadge tone="neutral" label="not queued" />
                </div>
              ))}
            </div>
          </section>

          <section className="border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Scheduling factors</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SCHEDULING_FACTORS.map((factor) => (
                <StatusBadge key={factor} tone="info" label={factor} />
              ))}
            </div>
            <p className="mt-3 text-meta text-text-secondary">
              Queue, priority, pause, resume, cancel, preemption, retry policy, and activity
              integration require a durable scheduler service and are not enforced by this screen.
            </p>
          </section>
        </>
      )}
    </div>
  )
}

function CapacityCard({
  label,
  value,
  healthy
}: {
  label: string
  value: string
  healthy: boolean
}): React.JSX.Element {
  return (
    <section className="border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption uppercase text-text-tertiary">{label}</p>
        <StatusBadge
          tone={healthy ? 'success' : 'warning'}
          label={healthy ? 'ok' : 'constrained'}
        />
      </div>
      <p className="mt-1 text-title font-semibold text-text-primary">{value}</p>
    </section>
  )
}
