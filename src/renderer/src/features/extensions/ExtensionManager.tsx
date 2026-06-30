import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type {
  ExtensionCapability,
  ExtensionHealthEvent,
  ExtensionInstallPreview,
  ExtensionRecord,
  ExtensionState
} from '@shared/contracts'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import {
  clearExtensionQuarantine,
  installExtension,
  listExtensions,
  onExtensionHealthEvent,
  previewExtensionInstall,
  removeExtension,
  setExtensionEnabled
} from '../../services/ipc/extensionClient'

function stateTone(state: ExtensionState): StatusTone {
  switch (state) {
    case 'enabled':
      return 'success'
    case 'installed':
    case 'disabled':
      return 'neutral'
    case 'quarantined':
      return 'error'
    case 'removed':
      return 'warning'
  }
}

function trustTone(trust: ExtensionRecord['trust']): StatusTone {
  switch (trust) {
    case 'verified-publisher':
    case 'signed':
      return 'success'
    case 'unsigned':
      return 'warning'
    case 'revoked':
      return 'error'
  }
}

function formatTime(value?: number): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

function ExtensionRow({
  record,
  selected,
  index,
  onSelect
}: {
  record: ExtensionRecord
  selected: boolean
  index: number
  onSelect: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `extension-row:${record.manifest.id}`,
    groupId: 'extension-manager',
    priority: index === 0 ? 1 : 0,
    initialFocus: index === 0,
    onActivate: onSelect
  })

  return (
    <ControllerButton
      ref={ref}
      variant="secondary"
      className={`flex items-center justify-between gap-3 text-left ${
        selected || isFocused ? 'ring-2 ring-border-focus' : ''
      }`}
      onClick={onSelect}
    >
      <span className="min-w-0">
        <span className="block truncate text-body font-semibold text-text-primary">
          {record.manifest.name}
        </span>
        <span className="block truncate text-meta text-text-secondary">
          {record.manifest.publisher} / {record.manifest.version}
        </span>
      </span>
      <StatusBadge tone={stateTone(record.state)} label={record.state} />
    </ControllerButton>
  )
}

function CapabilityList({ record }: { record: ExtensionRecord }): React.JSX.Element {
  if (record.manifest.capabilities.length === 0) {
    return <p className="text-meta text-text-secondary">This manifest requests no capabilities.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {record.manifest.capabilities.map((request) => {
        const granted = record.grantedCapabilities.includes(request.capability)
        return (
          <li
            key={request.capability}
            className="rounded-md border border-border bg-surface-raised p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-body font-medium text-text-primary">{request.capability}</span>
              <StatusBadge
                tone={granted ? 'success' : 'warning'}
                label={granted ? 'Granted' : 'Denied'}
              />
            </div>
            <p className="mt-1 text-meta text-text-secondary">{request.reason}</p>
          </li>
        )
      })}
    </ul>
  )
}

function InstallPreviewPanel({
  preview,
  approvedCapabilities,
  busy,
  onToggleCapability,
  onInstall,
  onCancel
}: {
  preview: ExtensionInstallPreview
  approvedCapabilities: ExtensionCapability[]
  busy: boolean
  onToggleCapability: (capability: ExtensionCapability) => void
  onInstall: () => void
  onCancel: () => void
}): React.JSX.Element {
  const requested = preview.requestedCapabilities

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-text-primary">{preview.manifest.name}</p>
          <p className="text-meta text-text-secondary">
            {preview.manifest.publisher} / {preview.manifest.version} / {preview.manifest.type}
          </p>
        </div>
        <StatusBadge tone={trustTone(preview.trust)} label={preview.trust} />
      </header>

      <dl className="grid gap-2 text-meta text-text-secondary md:grid-cols-2">
        <div>
          <dt className="font-semibold text-text-primary">Extension id</dt>
          <dd className="break-all">{preview.manifest.id}</dd>
        </div>
        <div>
          <dt className="font-semibold text-text-primary">Entrypoint</dt>
          <dd>{preview.manifest.entrypoints.main}</dd>
        </div>
      </dl>

      <section>
        <p className="mb-2 text-body font-semibold text-text-primary">Capability review</p>
        {requested.length === 0 ? (
          <p className="text-meta text-text-secondary">
            This extension requests no capabilities. Install can continue without grants.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {requested.map((request) => {
              const granted = approvedCapabilities.includes(request.capability)
              return (
                <li
                  key={request.capability}
                  className="rounded-md border border-border bg-surface-raised p-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-body font-medium text-text-primary">
                        {request.capability}
                      </p>
                      <p className="text-meta text-text-secondary">{request.reason}</p>
                    </div>
                    <ControllerButton
                      variant={granted ? 'secondary' : 'primary'}
                      disabled={busy}
                      onClick={() => onToggleCapability(request.capability)}
                    >
                      {granted ? 'Deny' : 'Grant'}
                    </ControllerButton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="text-meta text-text-secondary">
        Requested capabilities are denied by default. Only selected grants are approved for this
        local install.
      </p>

      <div className="flex flex-wrap gap-2">
        <ControllerButton variant="primary" disabled={busy} onClick={onInstall}>
          Install reviewed extension
        </ControllerButton>
        <ControllerButton variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel review
        </ControllerButton>
      </div>
    </section>
  )
}

function ExtensionDetail({
  record,
  busy,
  onToggle,
  onClearQuarantine,
  onRemove
}: {
  record: ExtensionRecord | null
  busy: boolean
  onToggle: (record: ExtensionRecord) => void
  onClearQuarantine: (record: ExtensionRecord) => void
  onRemove: (record: ExtensionRecord) => void
}): React.JSX.Element {
  if (!record) {
    return (
      <EmptyState
        title="No extension selected"
        description="Choose an installed extension to inspect its manifest, trust state, and granted capabilities."
      />
    )
  }

  const canEnable = record.state !== 'enabled' && record.state !== 'quarantined'
  const canDisable = record.state === 'enabled'

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto rounded-md border border-border bg-surface p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-title font-semibold text-text-primary">{record.manifest.name}</p>
          <p className="text-body text-text-secondary">{record.manifest.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={stateTone(record.state)} label={record.state} />
          <StatusBadge tone={trustTone(record.trust)} label={record.trust} />
        </div>
      </header>

      <dl className="grid gap-3 text-meta text-text-secondary md:grid-cols-2">
        <div>
          <dt className="font-semibold text-text-primary">Extension id</dt>
          <dd className="break-all">{record.manifest.id}</dd>
        </div>
        <div>
          <dt className="font-semibold text-text-primary">Type</dt>
          <dd>{record.manifest.type}</dd>
        </div>
        <div>
          <dt className="font-semibold text-text-primary">Installed path</dt>
          <dd className="break-all">{record.installPath}</dd>
        </div>
        <div>
          <dt className="font-semibold text-text-primary">Entrypoint</dt>
          <dd>{record.manifest.entrypoints.main}</dd>
        </div>
        <div>
          <dt className="font-semibold text-text-primary">Last fault</dt>
          <dd>{formatTime(record.lastFaultAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-text-primary">Faults in window</dt>
          <dd>{record.faultCount}</dd>
        </div>
      </dl>

      {record.quarantineReason && (
        <ErrorState
          className="items-start px-0 py-2 text-left"
          title="Quarantined"
          description={record.quarantineReason}
        />
      )}

      <section>
        <p className="mb-2 text-body font-semibold text-text-primary">Capabilities</p>
        <CapabilityList record={record} />
      </section>

      <div className="flex flex-wrap gap-2">
        {(canEnable || canDisable) && (
          <ControllerButton variant="primary" disabled={busy} onClick={() => onToggle(record)}>
            {canDisable ? 'Disable' : 'Enable'}
          </ControllerButton>
        )}
        {record.state === 'quarantined' && (
          <ControllerButton
            variant="secondary"
            disabled={busy}
            onClick={() => onClearQuarantine(record)}
          >
            Clear quarantine
          </ControllerButton>
        )}
        <ControllerButton variant="destructive" disabled={busy} onClick={() => onRemove(record)}>
          Remove
        </ControllerButton>
      </div>
    </section>
  )
}

/**
 * Epic X3 Extension Manager. Backed only by the real local extension runtime:
 * no marketplace data, SDK wizard, or unsigned "verified" claims are invented.
 */
export function ExtensionManager(): React.JSX.Element {
  const navigate = useNavigate()
  const [records, setRecords] = useState<ExtensionRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [directoryPath, setDirectoryPath] = useState('')
  const [preview, setPreview] = useState<ExtensionInstallPreview | null>(null)
  const [approvedCapabilities, setApprovedCapabilities] = useState<ExtensionCapability[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void listExtensions().then((result) => {
      if (!active) return
      if (result.ok) {
        setRecords(result.data)
        setSelectedId((current) => current ?? result.data[0]?.manifest.id ?? null)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
      setLoading(false)
    })
    const unsubscribe = onExtensionHealthEvent((event: ExtensionHealthEvent) => {
      setRecords((current) =>
        current.map((record) =>
          record.manifest.id === event.id
            ? {
                ...record,
                state: event.state,
                faultCount: event.faultCount,
                quarantineReason: event.quarantineReason
              }
            : record
        )
      )
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const selected = useMemo(
    () => records.find((record) => record.manifest.id === selectedId) ?? records[0] ?? null,
    [records, selectedId]
  )

  async function refresh(nextSelectedId?: string | null): Promise<void> {
    const result = await listExtensions()
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setRecords(result.data)
    setSelectedId(nextSelectedId ?? result.data[0]?.manifest.id ?? null)
    setError(null)
  }

  async function handlePreviewInstall(): Promise<void> {
    const trimmed = directoryPath.trim()
    if (!trimmed) return
    setBusy(true)
    const result = await previewExtensionInstall({ directoryPath: trimmed })
    setBusy(false)
    if (!result.ok) {
      setPreview(null)
      setApprovedCapabilities([])
      setError(result.error.userMessage)
      return
    }
    setPreview(result.data)
    setApprovedCapabilities([])
    setError(null)
  }

  async function handleInstallReviewed(): Promise<void> {
    if (!preview) return
    setBusy(true)
    const result = await installExtension({
      directoryPath: preview.directoryPath,
      approvedCapabilities
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setDirectoryPath('')
    setPreview(null)
    setApprovedCapabilities([])
    setRecords((current) => {
      const withoutExisting = current.filter(
        (record) => record.manifest.id !== result.data.manifest.id
      )
      return [...withoutExisting, result.data]
    })
    setSelectedId(result.data.manifest.id)
    setError(null)
  }

  function handleDirectoryChange(value: string): void {
    setDirectoryPath(value)
    if (preview && value.trim() !== preview.directoryPath) {
      setPreview(null)
      setApprovedCapabilities([])
    }
  }

  function handleToggleApprovedCapability(capability: ExtensionCapability): void {
    setApprovedCapabilities((current) =>
      current.includes(capability)
        ? current.filter((candidate) => candidate !== capability)
        : [...current, capability]
    )
  }

  async function handleToggle(record: ExtensionRecord): Promise<void> {
    setBusy(true)
    const result = await setExtensionEnabled({
      id: record.manifest.id,
      enabled: record.state !== 'enabled'
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setRecords((current) =>
      current.map((candidate) =>
        candidate.manifest.id === result.data.manifest.id ? result.data : candidate
      )
    )
    setError(null)
  }

  async function handleClearQuarantine(record: ExtensionRecord): Promise<void> {
    setBusy(true)
    const result = await clearExtensionQuarantine({ id: record.manifest.id })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setRecords((current) =>
      current.map((candidate) =>
        candidate.manifest.id === result.data.manifest.id ? result.data : candidate
      )
    )
    setError(null)
  }

  async function handleRemove(record: ExtensionRecord): Promise<void> {
    setBusy(true)
    const result = await removeExtension({ id: record.manifest.id })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    await refresh(
      records.find((candidate) => candidate.manifest.id !== record.manifest.id)?.manifest.id ?? null
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-meta text-text-secondary">Loading extensions...</p>
      </div>
    )
  }

  return (
    <div className="grid h-full min-w-[76rem] grid-cols-[20rem_minmax(40rem,1fr)_18rem] gap-2 overflow-auto">
      <NdxToolWindow title="Extension Sources" subtitle="Local runtime">
        <div className="space-y-3 text-meta text-text-secondary">
          <p>
            Installs are limited to local unpacked folders until marketplace and SDK trust
            foundations exist.
          </p>
          <p>{records.length} extension records are registered with the isolated runtime.</p>
        </div>
      </NdxToolWindow>

      <NdxEditorShell title="Extension Inventory">
        <div className="flex min-h-full min-w-0 flex-col gap-4 p-4">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-title font-semibold text-text-primary">Extension Manager</p>
              <p className="text-body text-text-secondary">
                Local unpacked extensions only. Marketplace, SDK, and CLI surfaces remain deferred
                until their real trust and API foundations exist.
              </p>
            </div>
            <div className="flex gap-2">
              <ControllerButton variant="ghost" onClick={() => navigate('/trusted-publishers')}>
                Trusted Publishers
              </ControllerButton>
              <ControllerButton
                variant="secondary"
                disabled={busy}
                onClick={() => void refresh(selectedId)}
              >
                Refresh
              </ControllerButton>
            </div>
          </header>

          {error && <ErrorState title="Extension error" description={error} className="py-3" />}

          <section className="flex flex-wrap gap-2 rounded-md border border-border bg-surface p-3">
            <input
              value={directoryPath}
              onChange={(event) => handleDirectoryChange(event.target.value)}
              placeholder="Absolute unpacked extension folder"
              className="min-w-64 flex-1 rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
            />
            <ControllerButton
              variant="primary"
              disabled={busy || !directoryPath.trim()}
              onClick={() => void handlePreviewInstall()}
            >
              Review local folder
            </ControllerButton>
          </section>

          {preview && (
            <InstallPreviewPanel
              preview={preview}
              approvedCapabilities={approvedCapabilities}
              busy={busy}
              onToggleCapability={handleToggleApprovedCapability}
              onInstall={() => void handleInstallReviewed()}
              onCancel={() => {
                setPreview(null)
                setApprovedCapabilities([])
              }}
            />
          )}

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.6fr)]">
            <section className="flex min-h-0 flex-col gap-2 overflow-auto">
              {records.length === 0 ? (
                <EmptyState
                  title="No extensions installed"
                  description="Install a local unpacked extension folder to validate its real manifest and register it with the isolated runtime."
                />
              ) : (
                records.map((record, index) => (
                  <ExtensionRow
                    key={record.manifest.id}
                    record={record}
                    selected={selected?.manifest.id === record.manifest.id}
                    index={index}
                    onSelect={() => setSelectedId(record.manifest.id)}
                  />
                ))
              )}
            </section>

            <ExtensionDetail
              record={selected}
              busy={busy}
              onToggle={(record) => void handleToggle(record)}
              onClearQuarantine={(record) => void handleClearQuarantine(record)}
              onRemove={(record) => void handleRemove(record)}
            />
          </div>
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Trust Policy" subtitle="Review required" side="right">
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Requested capabilities remain denied unless explicitly granted during review.</p>
          <p>Quarantined extensions stay blocked until the runtime clears their fault state.</p>
        </div>
      </NdxToolWindow>
    </div>
  )
}
