import { useState } from 'react'
import type { ModelRouteDecision, RoutingProfileId } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { routeModel } from '../../services/ipc/modelClient'

const PROFILES: Array<{ id: RoutingProfileId; label: string; description: string }> = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Use any reachable provider and measured system state.'
  },
  { id: 'local-first', label: 'Local First', description: 'Keep processing on this device.' },
  { id: 'offline', label: 'Offline', description: 'Use reachable local endpoints only.' },
  {
    id: 'battery-saver',
    label: 'Battery Saver',
    description: 'Prefer cloud inference to reduce device load.'
  },
  {
    id: 'maximum-quality',
    label: 'Maximum Quality',
    description: 'Use the best explicitly selected available model.'
  },
  {
    id: 'fast-coding',
    label: 'Fast Coding',
    description: 'Prefer low-latency local coding endpoints.'
  },
  { id: 'private-workspace', label: 'Private Workspace', description: 'Block cloud processing.' },
  {
    id: 'low-cost',
    label: 'Low Cost',
    description: 'Prefer local models with no provider request charge.'
  }
]

export function RoutingProfiles(): React.JSX.Element {
  const [profileId, setProfileId] = useState<RoutingProfileId>('balanced')
  const [decision, setDecision] = useState<ModelRouteDecision | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function preview(): Promise<void> {
    setLoading(true)
    const result = await routeModel({
      profileId,
      workspacePrivate: profileId === 'private-workspace',
      temperature: 0.2,
      maxTokens: 2048
    })
    setLoading(false)
    if (result.ok) {
      setDecision(result.data)
      setError(null)
    } else {
      setDecision(null)
      setError(result.error.userMessage)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div>
        <p className="text-title font-semibold text-text-primary">Routing Profiles</p>
        <p className="text-meta text-text-secondary">
          Routes against real provider availability and current device measurements.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {PROFILES.map((profile) => (
          <ControllerButton
            key={profile.id}
            variant={profileId === profile.id ? 'primary' : 'secondary'}
            onClick={() => setProfileId(profile.id)}
          >
            <span className="flex flex-col items-start">
              <span>{profile.label}</span>
              <span className="text-meta opacity-80">{profile.description}</span>
            </span>
          </ControllerButton>
        ))}
      </div>
      <ControllerButton variant="primary" disabled={loading} onClick={() => void preview()}>
        {loading ? 'Measuring and probing…' : 'Preview route'}
      </ControllerButton>
      {error && <ErrorState title="No route available" description={error} />}
      {decision && (
        <section className="border border-border bg-surface p-3">
          <p className="text-body font-semibold text-text-primary">{decision.modelId}</p>
          <p className="text-meta text-text-secondary">
            {decision.providerName} · {decision.local ? 'Local' : 'Cloud'}
          </p>
          <ul className="mt-2 text-meta text-text-tertiary">
            {decision.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="mt-2 text-meta text-text-secondary">
            Memory {decision.measured.memoryUsedPercent?.toFixed(1) ?? 'unavailable'}% · Battery{' '}
            {decision.measured.batteryPercent ?? 'unavailable'}% · Thermal{' '}
            {decision.measured.temperatureCelsius?.toFixed(1) ?? 'unavailable'}°C
          </p>
        </section>
      )}
    </div>
  )
}
