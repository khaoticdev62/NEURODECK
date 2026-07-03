import { useState, useEffect } from 'react'
import type { ModelRouteDecision, RoutingProfileId } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxFocusSurface, NdxToolWindow } from '../../components/workbench'
import { routeModel } from '../../services/ipc/modelClient'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'

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

  const selectedProfile = PROFILES.find((profile) => profile.id === profileId) ?? PROFILES[0]

  const setPrimary = useWorkbenchStore((state) => state.setPrimary)
  const setSecondary = useWorkbenchStore((state) => state.setSecondary)

  useEffect(() => {
    setPrimary('Profiles', `${PROFILES.length} routing modes`, (
      <NdxToolWindow title="Profiles" subtitle={`${PROFILES.length} routing modes`}>
        <p className="text-meta text-text-secondary">
          Profiles route against real provider availability and current device measurements.
        </p>
        <div className="flex flex-col gap-2">
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
      </NdxToolWindow>
    ))
    return () => setPrimary('Command Deck', undefined, null)
  }, [profileId, setPrimary])

  useEffect(() => {
    setSecondary(
      <NdxToolWindow title="Decision Context" subtitle={profileId} side="right">
        <div>
          <p className="text-meta font-semibold text-text-primary">Preview input</p>
          <p className="text-meta text-text-tertiary">
            Temperature 0.2, max 2048 tokens, private workspace only for private profile.
          </p>
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-meta font-semibold text-text-primary">Routing source</p>
          <p className="text-meta text-text-tertiary">
            The preview uses the existing typed model router IPC. No provider availability or
            measurements are mocked here.
          </p>
        </div>
      </NdxToolWindow>
    )
    return () => setSecondary(null)
  }, [profileId, setSecondary])

  return (
    <div className="h-full flex-1">
      <NdxEditorShell title="Routing Profiles">
        <div className="flex min-h-full flex-col gap-3 p-3">
          <NdxFocusSurface active density="comfortable" className="p-4">
            <p className="text-body font-semibold text-text-primary">{selectedProfile.label}</p>
            <p className="text-meta text-text-secondary">{selectedProfile.description}</p>
            <ControllerButton variant="primary" disabled={loading} onClick={() => void preview()}>
              {loading ? 'Measuring and probing...' : 'Preview route'}
            </ControllerButton>
          </NdxFocusSurface>

          {error && <ErrorState title="No route available" description={error} />}
          {decision && (
            <section className="ndx-settings-section">
              <p className="text-body font-semibold text-text-primary">{decision.modelId}</p>
              <p className="text-meta text-text-secondary">
                {decision.providerName} - {decision.local ? 'Local' : 'Cloud'}
              </p>
              <ul className="mt-2 text-meta text-text-tertiary">
                {decision.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="mt-2 text-meta text-text-secondary">
                Memory {decision.measured.memoryUsedPercent?.toFixed(1) ?? 'unavailable'}% - Battery{' '}
                {decision.measured.batteryPercent ?? 'unavailable'}% - Thermal{' '}
                {decision.measured.temperatureCelsius?.toFixed(1) ?? 'unavailable'} C
              </p>
            </section>
          )}
        </div>
      </NdxEditorShell>
    </div>
  )
}
