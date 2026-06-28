import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DeviceInventoryHealth, DeviceInventoryReport } from '@shared/contracts'
import { ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { collectDeviceInventory } from '../../services/ipc/deviceClient'

const HEALTH_TONE: Record<DeviceInventoryHealth, StatusTone> = {
  healthy: 'success',
  degraded: 'warning',
  unavailable: 'neutral',
  unsupported: 'error',
  unknown: 'neutral'
}

export function DevicePeripheralCenter(): React.JSX.Element {
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

  if (loading && !report)
    return <p className="p-4 text-meta text-text-secondary">Collecting device inventory...</p>

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-title font-semibold text-text-primary">Device and Peripheral Center</p>
          <p className="text-meta text-text-secondary">
            Live inventory from persisted devices, system metrics, and capability detection.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ControllerButton variant="secondary" onClick={() => navigate('/devices/bluetooth')}>
            Bluetooth
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

      {error && <ErrorState title="Device inventory error" description={error} />}

      {report && (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <SummaryStat label="Devices" value={String(report.deviceCount)} />
            <SummaryStat label="Connected" value={String(report.connectedCount)} />
            <SummaryStat label="Categories" value={String(report.categories.length)} />
            <SummaryStat
              label="Hot-plug"
              value={report.hotPlug.available ? 'Active' : 'Manual refresh'}
            />
          </section>

          <section className="border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-body font-semibold text-text-primary">Hot-plug behavior</p>
                <p className="text-meta text-text-secondary">{report.hotPlug.reason}</p>
              </div>
              <StatusBadge
                tone={report.hotPlug.available ? 'success' : 'neutral'}
                label={report.hotPlug.available ? 'active' : 'not active'}
              />
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            {report.devices.length === 0 ? (
              <div className="border border-border bg-surface p-3">
                <p className="text-body font-semibold text-text-primary">No devices detected</p>
                <p className="text-meta text-text-secondary">
                  No persisted device records or metric-derived network/storage devices were
                  available in this inventory pass.
                </p>
              </div>
            ) : (
              report.devices.map((device) => (
                <article key={device.id} className="border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-body font-semibold text-text-primary">{device.name}</p>
                      <p className="text-meta text-text-secondary">
                        {formatCategory(device.category)} · {device.type}
                      </p>
                    </div>
                    <StatusBadge tone={HEALTH_TONE[device.health]} label={device.health} />
                  </div>
                  <div className="mt-3 grid gap-2 text-meta text-text-secondary sm:grid-cols-2">
                    <DeviceFact label="Connected" value={device.connected ? 'Yes' : 'No'} />
                    <DeviceFact label="Capability" value={device.capabilityStatus} />
                    <DeviceFact label="Backend" value={device.driverBackend} />
                    <DeviceFact label="Source" value={device.source} />
                    <DeviceFact
                      label="Permissions"
                      value={device.permissions.length > 0 ? device.permissions.join(', ') : 'None'}
                    />
                    <DeviceFact
                      label="Last event"
                      value={new Date(device.lastEventAt).toLocaleTimeString()}
                    />
                  </div>
                  {device.detail && (
                    <p className="mt-2 text-caption text-text-tertiary">{device.detail}</p>
                  )}
                </article>
              ))
            )}
          </section>

          <section className="border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Capability detection</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {report.capabilities.map((capability) => (
                <div
                  key={capability.id}
                  className="flex items-start justify-between gap-3 border border-border bg-surface-raised p-2"
                >
                  <div>
                    <p className="text-meta font-semibold text-text-primary">{capability.id}</p>
                    <p className="text-caption text-text-tertiary">{capability.reason}</p>
                  </div>
                  <StatusBadge tone={capabilityTone(capability.status)} label={capability.status} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <section className="border border-border bg-surface p-3">
      <p className="text-caption uppercase text-text-tertiary">{label}</p>
      <p className="text-title font-semibold text-text-primary">{value}</p>
    </section>
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

function capabilityTone(status: string): StatusTone {
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
