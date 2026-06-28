import { useState } from 'react'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'

const TRIGGER_TYPES = [
  'Manual',
  'Time',
  'Interval',
  'Calendar recurrence',
  'App launch',
  'App exit',
  'Workspace open',
  'Workspace close',
  'File change',
  'Git event',
  'Network connect',
  'VPN connect',
  'Device connect',
  'Battery threshold',
  'Charging state',
  'Dock connect',
  'Model availability',
  'Download completion',
  'Remote host online',
  'System startup',
  'Resume from sleep'
]

const REQUIREMENTS = [
  'Persistent schedules',
  'Missed-run policy',
  'Time-zone awareness',
  'Daylight-saving handling',
  'Duplicate-run protection',
  'Concurrency control',
  'Quiet hours',
  'Battery policy',
  'Network policy',
  'Run history',
  'Next-run preview',
  'Disable',
  'Pause all',
  'Export/import'
]

export function SchedulerTriggers(): React.JSX.Element {
  const [lastCheckedAt, setLastCheckedAt] = useState(() => Date.now())

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-title font-semibold text-text-primary">Scheduler and Triggers</p>
          <p className="text-meta text-text-secondary">
            Durable scheduling inventory; trigger execution is not implemented yet.
          </p>
        </div>
        <ControllerButton variant="primary" onClick={() => setLastCheckedAt(Date.now())}>
          Refresh
        </ControllerButton>
      </div>

      <section className="border border-border bg-surface p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-body font-semibold text-text-primary">Scheduler health</p>
            <p className="text-meta text-text-secondary">
              No durable scheduler service, schedule store, permission grant store, or trigger
              runner is registered in this build.
            </p>
            <p className="text-caption text-text-tertiary">
              Checked {new Date(lastCheckedAt).toLocaleTimeString()}
            </p>
          </div>
          <StatusBadge tone="neutral" label="not wired" />
        </div>
      </section>

      <section className="border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Trigger types</p>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {TRIGGER_TYPES.map((trigger) => (
            <div
              key={trigger}
              className="flex items-start justify-between gap-3 border border-border bg-surface-raised p-2"
            >
              <p className="text-meta font-semibold text-text-primary">{trigger}</p>
              <StatusBadge tone="neutral" label="not wired" />
            </div>
          ))}
        </div>
      </section>

      <section className="border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Requirements</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REQUIREMENTS.map((requirement) => (
            <StatusBadge key={requirement} tone="neutral" label={requirement} />
          ))}
        </div>
        <p className="mt-3 text-meta text-text-secondary">
          Scheduled actions may not inherit broad permissions silently. A future scheduler must
          store explicit approved grants and re-request when policy changes.
        </p>
      </section>
    </div>
  )
}
