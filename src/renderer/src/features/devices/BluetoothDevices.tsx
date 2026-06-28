import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DeviceInventoryRecord, DeviceInventoryReport } from '@shared/contracts'
import { ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { collectDeviceInventory } from '../../services/ipc/deviceClient'

const BLUETOOTH_OPERATIONS = [
  {
    label: 'Scan',
    reason: 'No real BlueZ/SteamOS adapter scan service is implemented yet.'
  },
  {
    label: 'Pair',
    reason: 'Pairing needs a real confirmation flow and device identity verification.'
  },
  {
    label: 'Trust',
    reason: 'No trusted-device store is wired to a Bluetooth backend yet.'
  },
  {
    label: 'Connect / Disconnect',
    reason: 'Connection control requires a real Bluetooth service adapter.'
  },
  {
    label: 'Forget',
    reason: 'Removing devices from the OS Bluetooth registry is not implemented.'
  }
]

export function BluetoothDevices(): React.JSX.Element {
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

  const bluetoothCapability = report?.capabilities.find(
    (capability) => capability.id === 'bluetooth'
  )
  const bluetoothDevices =
    report?.devices.filter((device) => device.category === 'bluetooth-device') ?? []

  if (loading && !report)
    return <p className="p-4 text-meta text-text-secondary">Checking Bluetooth status...</p>

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-title font-semibold text-text-primary">Bluetooth Devices</p>
          <p className="text-meta text-text-secondary">
            Adapter status and known Bluetooth records from the shared device inventory.
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

      {error && <ErrorState title="Bluetooth status error" description={error} />}

      {report && (
        <>
          <section className="border border-border bg-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-body font-semibold text-text-primary">Adapter capability</p>
                <p className="text-meta text-text-secondary">
                  {bluetoothCapability?.reason ?? 'Bluetooth capability was not reported.'}
                </p>
                {bluetoothCapability?.provider && (
                  <p className="text-caption text-text-tertiary">
                    Backend: {bluetoothCapability.provider}
                  </p>
                )}
              </div>
              <StatusBadge
                tone={capabilityTone(bluetoothCapability?.status)}
                label={bluetoothCapability?.status ?? 'unknown'}
              />
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            {bluetoothDevices.length === 0 ? (
              <div className="border border-border bg-surface p-3">
                <p className="text-body font-semibold text-text-primary">
                  No Bluetooth devices in inventory
                </p>
                <p className="text-meta text-text-secondary">
                  NeuroDeck has no persisted Bluetooth device records and no real Bluetooth scan
                  backend yet.
                </p>
              </div>
            ) : (
              bluetoothDevices.map((device) => (
                <BluetoothDeviceCard key={device.id} device={device} />
              ))
            )}
          </section>

          <section className="border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Controls</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {BLUETOOTH_OPERATIONS.map((operation) => (
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

function BluetoothDeviceCard({ device }: { device: DeviceInventoryRecord }): React.JSX.Element {
  return (
    <article className="border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-text-primary">{device.name}</p>
          <p className="text-meta text-text-secondary">{device.type}</p>
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
