import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DeviceInventoryRecord, DeviceInventoryReport } from '@shared/contracts'
import { ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { collectDeviceInventory } from '../../services/ipc/deviceClient'

const DISPLAY_OPERATIONS = [
  {
    label: 'Arrange displays',
    reason: 'No real Wayland/KScreen display arrangement backend is implemented yet.'
  },
  {
    label: 'Set resolution',
    reason: 'Resolution changes require a real SteamOS display adapter and rollback timer.'
  },
  {
    label: 'Set refresh rate',
    reason: 'Refresh-rate control is deferred until display enumeration is real.'
  },
  {
    label: 'Dock profile',
    reason: 'No real dock detection or per-dock profile store exists yet.'
  },
  {
    label: 'Apply safe mode',
    reason: 'Display recovery safe mode needs a real OS display transaction layer.'
  }
]

export function DisplayDockCenter(): React.JSX.Element {
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

  const displayCapability = report?.capabilities.find(
    (capability) => capability.id === 'external-displays'
  )
  const displayDevices =
    report?.devices.filter((device) => ['display', 'dock'].includes(device.category)) ?? []

  if (loading && !report)
    return <p className="p-4 text-meta text-text-secondary">Checking display devices...</p>

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-title font-semibold text-text-primary">Display and Dock Center</p>
          <p className="text-meta text-text-secondary">
            Read-only display and dock status from the shared device inventory.
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

      {error && <ErrorState title="Display status error" description={error} />}

      {report && (
        <>
          <section className="border border-border bg-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-body font-semibold text-text-primary">
                  External display capability
                </p>
                <p className="text-meta text-text-secondary">
                  {displayCapability?.reason ?? 'External display capability was not reported.'}
                </p>
                {displayCapability?.provider && (
                  <p className="text-caption text-text-tertiary">
                    Backend: {displayCapability.provider}
                  </p>
                )}
              </div>
              <StatusBadge
                tone={capabilityTone(displayCapability?.status)}
                label={displayCapability?.status ?? 'unknown'}
              />
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            {displayDevices.length === 0 ? (
              <div className="border border-border bg-surface p-3">
                <p className="text-body font-semibold text-text-primary">
                  No display or dock records
                </p>
                <p className="text-meta text-text-secondary">
                  NeuroDeck has no persisted display/dock records and no real OS display enumeration
                  backend yet.
                </p>
              </div>
            ) : (
              displayDevices.map((device) => <DeviceCard key={device.id} device={device} />)
            )}
          </section>

          <section className="border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Controls</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {DISPLAY_OPERATIONS.map((operation) => (
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

function DeviceCard({ device }: { device: DeviceInventoryRecord }): React.JSX.Element {
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
