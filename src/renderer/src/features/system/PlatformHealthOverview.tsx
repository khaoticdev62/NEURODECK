import { useEffect, useMemo, useState } from 'react'
import type {
  CapabilityState,
  CrashReport,
  FeatureState,
  LanShareHealth,
  LanShareServiceStatus,
  NetworkDiagnostics,
  NdxResult,
  UpdateStatus
} from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { listCapabilities } from '../../services/ipc/capabilityClient'
import { listCrashReports } from '../../services/ipc/diagnosticsClient'
import { listFeatures } from '../../services/ipc/featureClient'
import { getLanShareHealth, getLanShareServiceStatus } from '../../services/ipc/lanShareClient'
import { getNetworkDiagnostics } from '../../services/ipc/networkClient'
import { getUpdateStatus } from '../../services/ipc/updateClient'

interface HealthState {
  features: SectionResult<FeatureState[]>
  capabilities: SectionResult<CapabilityState[]>
  network: SectionResult<NetworkDiagnostics>
  lanShareStatus: SectionResult<LanShareServiceStatus>
  lanShareHealth: SectionResult<LanShareHealth>
  updates: SectionResult<UpdateStatus>
  crashReports: SectionResult<CrashReport[]>
  refreshedAt: string
}

type SectionResult<T> = { ok: true; data: T } | { ok: false; message: string }

type HealthLevel = 'healthy' | 'degraded' | 'attention'

interface HealthCard {
  title: string
  level: HealthLevel
  summary: string
  details: string[]
}

export function PlatformHealthOverview(): React.JSX.Element {
  const [state, setState] = useState<HealthState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void collectHealthState().then((nextState) => {
      if (!active) return
      setState(nextState)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleRefresh(): Promise<void> {
    setLoading(true)
    const nextState = await collectHealthState()
    setState(nextState)
    setLoading(false)
  }

  const cards = useMemo(() => (state ? buildHealthCards(state) : []), [state])
  const attentionCount = cards.filter((card) => card.level === 'attention').length
  const degradedCount = cards.filter((card) => card.level === 'degraded').length

  if (!state && loading) {
    return <p className="p-4 text-meta text-text-secondary">Checking platform health...</p>
  }

  return (
    <div className="grid h-full min-w-[72rem] grid-cols-[20rem_minmax(36rem,1fr)_18rem] gap-2 overflow-auto">
      <NdxToolWindow title="Health Sources" subtitle="Aggregated">
        <p className="text-meta text-text-secondary">
          Feature registry, capabilities, network, LAN Share, updates, and crash reports are checked
          through their existing typed clients.
        </p>
        {state && (
          <div className="border-t border-border pt-3">
            <p className="text-meta font-semibold text-text-primary">Last checked</p>
            <p className="text-meta text-text-tertiary">
              {new Date(state.refreshedAt).toLocaleString()}
            </p>
          </div>
        )}
      </NdxToolWindow>

      <NdxEditorShell title="Platform Health">
        <div className="flex min-h-full flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-title font-semibold text-text-primary">Platform Health Overview</p>
              {state && (
                <p className="text-meta text-text-tertiary">
                  Last checked {new Date(state.refreshedAt).toLocaleString()}
                </p>
              )}
            </div>
            <ControllerButton
              variant="primary"
              disabled={loading}
              onClick={() => void handleRefresh()}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </ControllerButton>
          </div>

          <section className="grid grid-cols-3 gap-3">
            <SummaryTile label="Attention" value={String(attentionCount)} tone="attention" />
            <SummaryTile label="Degraded" value={String(degradedCount)} tone="degraded" />
            <SummaryTile
              label="Healthy"
              value={String(cards.length - attentionCount - degradedCount)}
            />
          </section>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {cards.map((card) => (
              <section
                key={card.title}
                className="flex flex-col gap-2 border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-body font-semibold text-text-primary">{card.title}</p>
                  <span className={`text-caption font-semibold ${levelClass(card.level)}`}>
                    {card.level}
                  </span>
                </div>
                <p className="text-meta text-text-secondary">{card.summary}</p>
                {card.details.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {card.details.map((detail) => (
                      <li key={detail} className="text-caption text-text-tertiary">
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Health Policy" subtitle="No remediation" side="right">
        <p className="text-meta text-text-tertiary">
          This overview reports health from real sources only. Repair actions remain in their owning
          screens.
        </p>
      </NdxToolWindow>
    </div>
  )
}

async function collectHealthState(): Promise<HealthState> {
  const [features, capabilities, network, lanShareStatus, lanShareHealth, updates, crashReports] =
    await Promise.all([
      toSectionResult(listFeatures()),
      toSectionResult(listCapabilities()),
      toSectionResult(getNetworkDiagnostics()),
      toSectionResult(getLanShareServiceStatus()),
      toSectionResult(getLanShareHealth()),
      toSectionResult(getUpdateStatus()),
      toSectionResult(listCrashReports())
    ])

  return {
    features,
    capabilities,
    network,
    lanShareStatus,
    lanShareHealth,
    updates,
    crashReports,
    refreshedAt: new Date().toISOString()
  }
}

async function toSectionResult<T>(promise: Promise<NdxResult<T>>): Promise<SectionResult<T>> {
  try {
    const result = await promise
    if (result.ok) return { ok: true, data: result.data }
    return { ok: false, message: result.error.userMessage }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'The health check failed.'
    }
  }
}

function buildHealthCards(state: HealthState): HealthCard[] {
  return [
    buildFeatureCard(state.features),
    buildCapabilityCard(state.capabilities),
    buildNetworkCard(state.network),
    buildLanShareCard(state.lanShareStatus, state.lanShareHealth),
    buildUpdateCard(state.updates),
    buildCrashCard(state.crashReports)
  ]
}

function buildFeatureCard(result: SectionResult<FeatureState[]>): HealthCard {
  if (!result.ok) return failedCard('Feature Registry', result.message)
  const visible = result.data.filter((feature) => feature.visibility === 'visible').length
  const disabled = result.data.filter((feature) => feature.visibility === 'disabled')
  const hidden = result.data.filter((feature) => feature.visibility === 'hidden')
  const level: HealthLevel =
    hidden.length > 0 ? 'attention' : disabled.length > 0 ? 'degraded' : 'healthy'
  return {
    title: 'Feature Registry',
    level,
    summary: `${visible} visible, ${disabled.length} disabled, ${hidden.length} hidden.`,
    details: [...disabled, ...hidden].slice(0, 4).map((feature) => {
      return `${feature.descriptor.name}: ${feature.reason ?? 'No reason reported'}`
    })
  }
}

function buildCapabilityCard(result: SectionResult<CapabilityState[]>): HealthCard {
  if (!result.ok) return failedCard('Capabilities', result.message)
  const available = result.data.filter((capability) => capability.status === 'available').length
  const attention = result.data.filter((capability) =>
    ['permission-required', 'dependency-required', 'temporarily-unavailable'].includes(
      capability.status
    )
  )
  const degraded = result.data.filter((capability) => capability.status === 'degraded')
  const level: HealthLevel =
    attention.length > 0 ? 'attention' : degraded.length > 0 ? 'degraded' : 'healthy'
  return {
    title: 'Capabilities',
    level,
    summary: `${available} available, ${degraded.length} degraded, ${attention.length} need attention.`,
    details: [...attention, ...degraded].slice(0, 5).map((capability) => {
      return `${capability.id}: ${capability.reason}`
    })
  }
}

function buildNetworkCard(result: SectionResult<NetworkDiagnostics>): HealthCard {
  if (!result.ok) return failedCard('Network', result.message)
  const unavailable = [
    metricIssue('Interfaces', result.data.interfaces),
    metricIssue('Connections', result.data.connections),
    metricIssue('DNS', result.data.dns),
    metricIssue('Proxy', result.data.proxy),
    metricIssue('VPN', result.data.vpn),
    metricIssue('Firewall', result.data.firewall)
  ].filter((detail): detail is string => Boolean(detail))
  return {
    title: 'Network',
    level: unavailable.length > 0 ? 'degraded' : 'healthy',
    summary: `${result.data.interfaces.value?.length ?? 0} interfaces, ${
      result.data.connections.value?.length ?? 0
    } connections, ${unavailable.length} unavailable checks.`,
    details: unavailable
  }
}

function metricIssue(
  label: string,
  metric: { available: boolean; source: string; reason?: string }
): string | null {
  if (metric.available) return null
  return `${label}: ${metric.reason ?? metric.source}`
}

function buildLanShareCard(
  statusResult: SectionResult<LanShareServiceStatus>,
  healthResult: SectionResult<LanShareHealth>
): HealthCard {
  if (!statusResult.ok) return failedCard('LAN Share', statusResult.message)
  if (!healthResult.ok) return failedCard('LAN Share', healthResult.message)
  const problems = [
    !healthResult.data.transferPortBound ? 'Transfer socket is not bound.' : null,
    !healthResult.data.authPortBound ? 'Registration socket is not bound.' : null,
    !healthResult.data.receiveDirectoryWritable ? 'Receive directory is not writable.' : null
  ].filter((problem): problem is string => Boolean(problem))
  const level: HealthLevel =
    statusResult.data.state === 'error' ? 'attention' : problems.length > 0 ? 'degraded' : 'healthy'
  return {
    title: 'LAN Share',
    level,
    summary: `${statusResult.data.state}: ${statusResult.data.reason}`,
    details: problems.length
      ? problems
      : [`${healthResult.data.interfaceCount} network interfaces detected.`]
  }
}

function buildUpdateCard(result: SectionResult<UpdateStatus>): HealthCard {
  if (!result.ok) return failedCard('Updates', result.message)
  const level: HealthLevel = !result.data.checkEnabled
    ? 'degraded'
    : result.data.updateAvailable
      ? 'attention'
      : 'healthy'
  return {
    title: 'Updates',
    level,
    summary: result.data.updateAvailable
      ? `Version ${result.data.latestVersion ?? 'unknown'} is available.`
      : `Current version ${result.data.currentVersion} on ${result.data.channel}.`,
    details: result.data.reason ? [result.data.reason] : []
  }
}

function buildCrashCard(result: SectionResult<CrashReport[]>): HealthCard {
  if (!result.ok) return failedCard('Crash Reports', result.message)
  const recent = result.data.slice(0, 3)
  return {
    title: 'Crash Reports',
    level: recent.length > 0 ? 'attention' : 'healthy',
    summary:
      recent.length > 0
        ? `${recent.length} recent local crash report${recent.length === 1 ? '' : 's'} recorded.`
        : 'No local crash reports recorded.',
    details: recent.map((report) => `${report.kind}: ${report.message}`)
  }
}

function failedCard(title: string, message: string): HealthCard {
  return {
    title,
    level: 'attention',
    summary: 'Health source failed.',
    details: [message]
  }
}

function SummaryTile({
  label,
  value,
  tone = 'healthy'
}: {
  label: string
  value: string
  tone?: HealthLevel
}): React.JSX.Element {
  return (
    <section className="border border-border bg-surface p-3">
      <p className="text-caption text-text-tertiary">{label}</p>
      <p className={`text-title font-semibold ${levelClass(tone)}`}>{value}</p>
    </section>
  )
}

function levelClass(level: HealthLevel): string {
  if (level === 'attention') return 'text-status-error'
  if (level === 'degraded') return 'text-status-warning'
  return 'text-status-success'
}
