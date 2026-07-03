import { NeuralPulse } from '../primitives/NeuralPulse'
import { StatusBadge } from '../primitives/StatusBadge'
import type { FieldStatus, SystemRailStatus } from '../navigation/systemRailStatus'
import { UNAVAILABLE_SYSTEM_RAIL_STATUS } from '../navigation/systemRailStatus'

/** Real enabled model provider (from `listModelProviders()`) — never a fabricated "Connected" claim. */
export interface ActiveModelProvider {
  name: string
  enabled: boolean
}

export interface NdxTitleBarProps {
  status?: SystemRailStatus
  activeProfileName?: string | null
  /** Route-derived path segments (ShellLayout), rendered left of center as the global breadcrumb. */
  breadcrumb?: string[]
  activeModelProvider?: ActiveModelProvider | null
}

/**
 * TopNavBar: 36px fixed 3-zone bar — left breadcrumb, centered model status
 * badge, right system-status cluster. Window controls are intentionally
 * omitted: this app renders inside the native OS title bar (no `frame:
 * false`), so a custom minimize/maximize/close row would duplicate controls
 * the OS already provides.
 */
export function NdxTitleBar({
  status = UNAVAILABLE_SYSTEM_RAIL_STATUS,
  activeProfileName,
  breadcrumb = [],
  activeModelProvider = null
}: NdxTitleBarProps): React.JSX.Element {
  const profile =
    status.profile.available || !activeProfileName
      ? status.profile
      : { available: true, value: activeProfileName }

  return (
    <header
      role="banner"
      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-titlebar-bg)] px-[var(--ndx-safe-inset)]"
      style={{ zIndex: 'var(--ndx-z-rail)' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <NeuralPulse
          size={20}
          state={
            status.agentActivity.available && status.agentActivity.value === 'active'
              ? 'streaming'
              : 'idle'
          }
        />
        <span className="shrink-0 text-meta font-semibold text-text-primary">NeuroDeck</span>
        <span className="hidden shrink-0 border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-panel-bg)] px-2 py-0.5 text-meta text-text-secondary deck:inline">
          Command Center
        </span>
        <TopNavBreadcrumb segments={breadcrumb} />
      </div>

      <div className="flex shrink-0 items-center justify-center">
        <ModelStatusBadge provider={activeModelProvider} />
      </div>

      <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
        <RailField className="hidden deck:inline" label="Project" status={status.workspace} />
        <RailField label="Profile" status={profile} />
        <ConnectionField status={status.connection} />
        <RailField className="hidden docked:inline" label="VPN" status={status.vpn} />
        <AgentActivityField status={status.agentActivity} />
        <Clock />
      </div>
    </header>
  )
}

function TopNavBreadcrumb({ segments }: { segments: string[] }): React.JSX.Element | null {
  if (segments.length === 0) return null
  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden min-w-0 items-center gap-1 truncate text-meta text-text-tertiary deck:flex"
    >
      {segments.map((segment, index) => (
        <span key={`${segment}-${index}`} className="flex min-w-0 items-center gap-1">
          <span aria-hidden="true">›</span>
          <span
            className={index === segments.length - 1 ? 'truncate text-text-secondary' : 'truncate'}
          >
            {segment}
          </span>
        </span>
      ))}
    </nav>
  )
}

function ModelStatusBadge({
  provider
}: {
  provider: ActiveModelProvider | null
}): React.JSX.Element {
  if (!provider) return <StatusBadge tone="neutral" label="No model provider" />
  return (
    <StatusBadge
      tone={provider.enabled ? 'success' : 'neutral'}
      label={`${provider.name} ${provider.enabled ? '· ENABLED' : '· DISABLED'}`}
    />
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
