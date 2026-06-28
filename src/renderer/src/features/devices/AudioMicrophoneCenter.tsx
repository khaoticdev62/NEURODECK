import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DeviceInventoryRecord, DeviceInventoryReport } from '@shared/contracts'
import { ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { collectDeviceInventory } from '../../services/ipc/deviceClient'

const AUDIO_OPERATIONS = [
  {
    label: 'Select output',
    reason: 'No real PipeWire/PulseAudio output-routing backend is implemented yet.'
  },
  {
    label: 'Select microphone',
    reason: 'No real audio-input enumeration or routing backend is implemented yet.'
  },
  {
    label: 'Test microphone',
    reason: 'No local audio capture meter or loopback diagnostic exists yet.'
  },
  {
    label: 'Set input gain',
    reason: 'Gain control needs a real OS audio backend and permission-aware capture flow.'
  },
  {
    label: 'Headset profile',
    reason: 'Bluetooth/audio profile switching is deferred until the Bluetooth backend is real.'
  }
]

export function AudioMicrophoneCenter(): React.JSX.Element {
  const navigate = useNavigate()
  const [report, setReport] = useState<DeviceInventoryReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void collectDeviceInventory().then((result) => {
      if (!active) return
      setLoading(false)
      if (result.ok) {
        setReport(result.data)
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
    const result = await collectDeviceInventory()
    setLoading(false)
    if (result.ok) {
      setReport(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  const microphoneCapability = report?.capabilities.find(
    (capability) => capability.id === 'microphone'
  )
  const audioDevices =
    report?.devices.filter((device) =>
      ['audio-output', 'microphone', 'headset'].includes(device.category)
    ) ?? []

  if (loading && !report)
    return <p className="p-4 text-meta text-text-secondary">Checking audio devices...</p>

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-title font-semibold text-text-primary">Audio and Microphone Center</p>
          <p className="text-meta text-text-secondary">
            Read-only audio status from the shared device inventory and microphone capability.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ControllerButton variant="secondary" onClick={() => navigate('/devices')}>
            Device Center
          </ControllerButton>
          <ControllerButton
            variant="primary"
            disabled={loading}
            onClick={() => void handleRefresh()}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </ControllerButton>
        </div>
      </div>

      {error && <ErrorState title="Audio status error" description={error} />}

      {report && (
        <>
          <section className="border border-border bg-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-body font-semibold text-text-primary">Microphone capability</p>
                <p className="text-meta text-text-secondary">
                  {microphoneCapability?.reason ?? 'Microphone capability was not reported.'}
                </p>
                {microphoneCapability?.provider && (
                  <p className="text-caption text-text-tertiary">
                    Backend: {microphoneCapability.provider}
                  </p>
                )}
              </div>
              <StatusBadge
                tone={capabilityTone(microphoneCapability?.status)}
                label={microphoneCapability?.status ?? 'unknown'}
              />
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            {audioDevices.length === 0 ? (
              <div className="border border-border bg-surface p-3">
                <p className="text-body font-semibold text-text-primary">
                  No audio devices in inventory
                </p>
                <p className="text-meta text-text-secondary">
                  NeuroDeck has no persisted audio device records and no real OS audio enumeration
                  backend yet.
                </p>
              </div>
            ) : (
              audioDevices.map((device) => <AudioDeviceCard key={device.id} device={device} />)
            )}
          </section>

          <section className="border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Controls</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {AUDIO_OPERATIONS.map((operation) => (
                <div
                  key={operation.label}
                  className="flex items-start justify-between gap-3 border border-border bg-surface-raised p-2"
                >
                  <div>
                    <p className="text-meta font-semibold text-text-primary">{operation.label}</p>
                    <p className="text-caption text-text-tertiary">{operation.reason}</p>
                  </div>
                  <StatusBadge tone="neutral" label="not wired" />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function AudioDeviceCard({ device }: { device: DeviceInventoryRecord }): React.JSX.Element {
  return (
    <article className="border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-text-primary">{device.name}</p>
          <p className="text-meta text-text-secondary">{formatCategory(device.category)}</p>
        </div>
        <StatusBadge
          tone={device.connected ? 'success' : 'neutral'}
          label={device.connected ? 'connected' : 'offline'}
        />
      </div>
      <div className="mt-3 grid gap-2 text-meta text-text-secondary sm:grid-cols-2">
        <DeviceFact label="Health" value={device.health} />
        <DeviceFact label="Capability" value={device.capabilityStatus} />
        <DeviceFact label="Backend" value={device.driverBackend} />
        <DeviceFact
          label="Permissions"
          value={device.permissions.length > 0 ? device.permissions.join(', ') : 'None'}
        />
      </div>
      {device.detail && <p className="mt-2 text-caption text-text-tertiary">{device.detail}</p>}
    </article>
  )
}

function DeviceFact({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <p>
      <span className="text-text-tertiary">{label}: </span>
      <span className="text-text-primary">{value}</span>
    </p>
  )
}

function formatCategory(category: string): string {
  return category
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function capabilityTone(status: string | undefined): StatusTone {
  switch (status) {
    case 'available':
      return 'success'
    case 'dependency-required':
    case 'permission-required':
    case 'degraded':
      return 'warning'
    case 'unsupported':
      return 'error'
    default:
      return 'neutral'
  }
}
