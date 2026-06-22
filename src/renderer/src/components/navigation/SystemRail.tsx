import { useEffect, useState } from 'react'
import { StatusBadge } from '../primitives/StatusBadge'
import {
  type FieldStatus,
  type SystemRailStatus,
  UNAVAILABLE_SYSTEM_RAIL_STATUS
} from './systemRailStatus'

export interface SystemRailProps {
  status: SystemRailStatus
}

/**
 * Top System Rail (wireframe §6.1). Fields without a real backing service render
 * an explicit "—" / unavailable state rather than fabricated values — per the
 * platform rule against false hardware/service assumptions (supplemental §3.7).
 * Real workspace/profile/model/connection/VPN/battery/agent wiring lands in the
 * epics that own those services (5, 9, 11, 8).
 */
export function SystemRail({
  status = UNAVAILABLE_SYSTEM_RAIL_STATUS
}: SystemRailProps): React.JSX.Element {
  return (
    <header
      role="banner"
      className="flex items-center justify-between border-b border-border bg-surface px-[var(--ndx-safe-inset)]"
      style={{ height: 'var(--ndx-rail-top-height)', zIndex: 'var(--ndx-z-rail)' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-body font-semibold tracking-wide text-text-primary">NeuroDeck</span>
        <RailField label="Workspace" status={status.workspace} />
        <RailField label="Profile" status={status.profile} />
      </div>
      <div className="flex items-center gap-3">
        <RailField label="Model" status={status.model} />
        <ConnectionField status={status.connection} />
        <RailField
          label="VPN"
          status={{
            available: status.vpn.available,
            value: status.vpn.value
          }}
        />
        <AgentActivityField status={status.agentActivity} />
        <Clock />
      </div>
    </header>
  )
}

function RailField({
  label,
  status
}: {
  label: string
  status: FieldStatus<unknown>
}): React.JSX.Element {
  return (
    <span className="text-meta text-text-secondary">
      {label}:{' '}
      <span className="text-text-primary">{status.available ? String(status.value) : '—'}</span>
    </span>
  )
}

function ConnectionField({
  status
}: {
  status: FieldStatus<'online' | 'offline'>
}): React.JSX.Element {
  if (!status.available) return <StatusBadge tone="neutral" label="Connection unavailable" />
  return (
    <StatusBadge
      tone={status.value === 'online' ? 'success' : 'error'}
      label={status.value === 'online' ? 'Online' : 'Offline'}
    />
  )
}

function AgentActivityField({
  status
}: {
  status: FieldStatus<'idle' | 'active'>
}): React.JSX.Element {
  if (!status.available) return <></>
  if (status.value === 'idle') return <></>
  return <StatusBadge tone="approval" label="Agent active" />
}

function Clock(): React.JSX.Element {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <time className="text-meta text-text-secondary" dateTime={now.toISOString()}>
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </time>
  )
}
