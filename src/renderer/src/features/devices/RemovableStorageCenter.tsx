import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DeviceInventoryRecord, DeviceInventoryReport } from '@shared/contracts'
import { ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { collectDeviceInventory } from '../../services/ipc/deviceClient'

const STORAGE_OPERATIONS = [
  {
    label: 'Mount',
    reason: 'No real udisks2/SteamOS removable-storage mount adapter is implemented yet.'
  },
  {
    label: 'Eject',
    reason: 'Safe eject needs a real OS transaction with flush and device-state verification.'
  },
  {
    label: 'Open in File Manager',
    reason:
      'Opening removable roots needs real mount-point discovery and workspace boundary checks.'
  },
  {
    label: 'Format',
    reason: 'Formatting is destructive and needs a dedicated reviewed storage workflow.'
  },
  {
    label: 'Repair',
    reason: 'Filesystem repair requires real platform tooling and a rollback/recovery plan.'
  }
]

export function RemovableStorageCenter(): React.JSX.Element {
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

  const storageDevices = report?.devices.filter((device) => device.category === 'storage') ?? []

  if (loading && !report)
    return <p className="p-4 text-meta text-text-secondary">Checking storage devices...</p>

  return (
    <div className="grid h-full grid-cols-1 gap-2 overflow-auto docked:min-w-[76rem] docked:grid-cols-[20rem_minmax(40rem,1fr)_18rem]">
      <NdxToolWindow title="Storage Scope" subtitle="udisks2 pending">
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Storage records come from persisted inventory and system metrics roots.</p>
          <p>Mount, eject, format, and repair need real OS transactions and recovery gates.</p>
        </div>
      </NdxToolWindow>

      <NdxEditorShell title="Storage Inventory">
        <div className="flex min-h-full min-w-0 flex-col gap-4 overflow-auto p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-title font-semibold text-text-primary">Removable Storage Center</p>
              <p className="text-meta text-text-secondary">
                Read-only storage status from the shared device inventory.
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

          {error && <ErrorState title="Storage status error" description={error} />}

          {report && (
            <>
              <section className="ndx-settings-section">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body font-semibold text-text-primary">Discovery scope</p>
                    <p className="text-meta text-text-secondary">
                      Current data comes from persisted storage records and the system metrics
                      storage root. No real removable-media watcher or mount-point classifier exists
                      yet.
                    </p>
                  </div>
                  <StatusBadge tone="neutral" label="manual refresh" />
                </div>
              </section>

              <section className="grid gap-3 lg:grid-cols-2">
                {storageDevices.length === 0 ? (
                  <div className="ndx-settings-section">
                    <p className="text-body font-semibold text-text-primary">
                      No storage devices in inventory
                    </p>
                    <p className="text-meta text-text-secondary">
                      NeuroDeck has no persisted storage records and no removable-storage backend
                      yet.
                    </p>
                  </div>
                ) : (
                  storageDevices.map((device) => (
                    <StorageDeviceCard key={device.id} device={device} />
                  ))
                )}
              </section>

              <section className="ndx-settings-section">
                <p className="text-body font-semibold text-text-primary">Controls</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {STORAGE_OPERATIONS.map((operation) => (
                    <div
                      key={operation.label}
                      className="flex items-start justify-between gap-3 border border-border bg-surface-raised p-2"
                    >
                      <div>
                        <p className="text-meta font-semibold text-text-primary">
                          {operation.label}
                        </p>
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
      </NdxEditorShell>

      <NdxToolWindow title="Operation Policy" subtitle="Recovery gated" side="right">
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Destructive media actions require reviewed workflows before they can execute.</p>
          <p>Workspace boundary checks are required before opening removable roots.</p>
        </div>
      </NdxToolWindow>
    </div>
  )
}

function StorageDeviceCard({ device }: { device: DeviceInventoryRecord }): React.JSX.Element {
  return (
    <article className="ndx-settings-section">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-text-primary">{device.name}</p>
          <p className="text-meta text-text-secondary">{device.type}</p>
        </div>
        <StatusBadge
          tone={device.health === 'degraded' ? 'warning' : 'success'}
          label={device.health}
        />
      </div>
      <div className="mt-3 grid gap-2 text-meta text-text-secondary sm:grid-cols-2">
        <DeviceFact label="Connected" value={device.connected ? 'Yes' : 'No'} />
        <DeviceFact label="Capability" value={device.capabilityStatus} />
        <DeviceFact label="Backend" value={device.driverBackend} />
        <DeviceFact label="Source" value={device.source} />
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
