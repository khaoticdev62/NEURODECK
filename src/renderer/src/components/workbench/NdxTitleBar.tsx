import { StatusBadge } from '../primitives/StatusBadge'
import type { FieldStatus, SystemRailStatus } from '../navigation/systemRailStatus'
import { UNAVAILABLE_SYSTEM_RAIL_STATUS } from '../navigation/systemRailStatus'

export interface NdxTitleBarProps {
  status?: SystemRailStatus
  activeProfileName?: string | null
}

export function NdxTitleBar({
  status = UNAVAILABLE_SYSTEM_RAIL_STATUS,
  activeProfileName
}: NdxTitleBarProps): React.JSX.Element {
  const profile =
    status.profile.available || !activeProfileName
      ? status.profile
      : { available: true, value: activeProfileName }

  return (
    <header
      role="banner"
      className="flex items-center justify-between border-b border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-titlebar-bg)] px-[var(--ndx-safe-inset)]"
      style={{ zIndex: 'var(--ndx-z-rail)' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-body font-semibold text-text-primary">NeuroDeck</span>
        <span className="border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-panel-bg)] px-2 py-0.5 text-meta text-text-secondary">
          Command Center
        </span>
        <RailField className="hidden deck:inline" label="Project" status={status.workspace} />
        <RailField label="Profile" status={profile} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <RailField label="Model" status={status.model} />
        <ConnectionField status={status.connection} />
        <RailField className="hidden docked:inline" label="VPN" status={status.vpn} />
        <AgentActivityField status={status.agentActivity} />
        <Clock />
      </div>
    </header>
  )
}

function RailField({
  label,
  status,
  className
}: {
  label: string
  status: FieldStatus<unknown>
  className?: string
}): React.JSX.Element {
  return (
    <span className={`truncate text-meta text-text-secondary ${className ?? ''}`}>
      {label}:{' '}
      <span className="text-text-primary">{status.available ? String(status.value) : '-'}</span>
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
  if (!status.available || status.value === 'idle') return <></>
  return <StatusBadge tone="approval" label="Agent active" />
}

function Clock(): React.JSX.Element {
  const now = new Date()
  return (
    <time className="text-meta text-text-secondary" dateTime={now.toISOString()}>
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </time>
  )
}
