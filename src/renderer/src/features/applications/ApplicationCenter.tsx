import { useEffect, useMemo, useState } from 'react'
import type {
  ApplicationRecord,
  ApplicationSource,
  FlatpakPermissionPreview,
  FlatpakRemoteApp,
  TransactionRecord,
  TransactionStatus
} from '@shared/contracts'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { NdxEditorShell, NdxFocusSurface, NdxToolWindow } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import {
  discoverApplications,
  launchApplication,
  listApplications,
  registerAppImage,
  removeApplication
} from '../../services/ipc/applicationClient'
import {
  installFlatpak,
  listPackageTransactions,
  onPackageTransactionUpdate,
  previewFlatpakPermissions,
  searchFlatpak,
  uninstallFlatpak,
  updateFlatpak
} from '../../services/ipc/packageClient'

function sourceTone(source: ApplicationSource): StatusTone {
  switch (source) {
    case 'steam':
    case 'flatpak':
    case 'appimage':
      return 'success'
    case 'desktop-entry':
    case 'system':
      return 'info'
    case 'custom':
    case 'internal':
      return 'approval'
    case 'remote':
    case 'web':
      return 'warning'
  }
}

function transactionTone(status: TransactionStatus): StatusTone {
  switch (status) {
    case 'succeeded':
      return 'success'
    case 'failed':
    case 'rolled-back':
      return 'error'
    case 'cancelled':
      return 'warning'
    case 'pending':
    case 'running':
      return 'info'
  }
}

function formatTime(value?: number): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

function ApplicationRow({
  application,
  index,
  selected,
  onSelect
}: {
  application: ApplicationRecord
  index: number
  selected: boolean
  onSelect: () => void
}): React.JSX.Element {
  // The spatial focus engine moves real DOM focus to `ref`, so
  // `NdxFocusSurface`'s own `:focus-within` CSS already renders the
  // tvOS-style scale/glow treatment (Phase 2) without needing `isFocused`
  // threaded into `selected`, which is reserved for "this is the currently
  // selected application" (a real, persistent state, not transient focus).
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `application-row:${application.id}`,
    groupId: 'application-center',
    priority: index === 0 ? 1 : 0,
    initialFocus: index === 0,
    onActivate: onSelect
  })

  return (
    <NdxFocusSurface density="spatial" selected={selected} className="w-full">
      <button
        ref={ref}
        type="button"
        onClick={onSelect}
        className="grid h-auto min-h-[4rem] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-body font-semibold text-text-primary">
            {application.name}
          </span>
          <span className="block truncate text-meta text-text-secondary">
            {application.executableRef ?? 'No executable reference'}
          </span>
        </span>
        <StatusBadge tone={sourceTone(application.source)} label={application.source} />
      </button>
    </NdxFocusSurface>
  )
}

function TransactionList({
  transactions
}: {
  transactions: TransactionRecord[]
}): React.JSX.Element {
  if (transactions.length === 0) {
    return (
      <p className="rounded-sm ndx-settings-section text-meta text-text-secondary">
        No package transactions yet.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {transactions.map((transaction) => (
        <li key={transaction.id} className="rounded-sm ndx-settings-section">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-text-primary">
                {transaction.label}
              </p>
              <p className="text-meta text-text-secondary">
                {transaction.kind} / {transaction.progressPercent}%
              </p>
            </div>
            <StatusBadge tone={transactionTone(transaction.status)} label={transaction.status} />
          </div>
          {transaction.message && (
            <p className="mt-2 text-meta text-text-secondary">{transaction.message}</p>
          )}
        </li>
      ))}
    </ul>
  )
}

function PermissionPreview({
  preview
}: {
  preview: FlatpakPermissionPreview | null
}): React.JSX.Element {
  if (!preview) {
    return (
      <p className="text-meta text-text-secondary">
        Select a Flatpak result and preview permissions before installing.
      </p>
    )
  }

  if (preview.permissions.length === 0) {
    return (
      <p className="text-meta text-text-secondary">
        {preview.ref} reported no explicit Flatpak permission lines.
      </p>
    )
  }

  return (
    <ul className="flex max-h-40 flex-col gap-1 overflow-auto rounded-sm border border-border bg-canvas p-2">
      {preview.permissions.map((permission) => (
        <li key={permission} className="break-all text-meta text-text-secondary">
          {permission}
        </li>
      ))}
    </ul>
  )
}

/**
 * Epic X2 Application Center. This is only a renderer surface over already-real
 * app discovery, launch, AppImage registration, Flatpak lifecycle, and
 * transaction IPC. It deliberately avoids fake catalog data: Flatpak search
 * results come from the real CLI adapter, and an unavailable Flatpak install
 * returns the real empty/error state from that adapter.
 */
export function ApplicationCenter(): React.JSX.Element {
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [flatpakQuery, setFlatpakQuery] = useState('')
  const [flatpakResults, setFlatpakResults] = useState<FlatpakRemoteApp[]>([])
  const [selectedFlatpakRef, setSelectedFlatpakRef] = useState<string | null>(null)
  const [permissionPreview, setPermissionPreview] = useState<FlatpakPermissionPreview | null>(null)
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([listApplications(), listPackageTransactions()]).then(
      ([applicationResult, transactionResult]) => {
        if (!active) return
        if (applicationResult.ok) {
          setApplications(applicationResult.data)
          setSelectedId((current) => current ?? applicationResult.data[0]?.id ?? null)
        } else {
          setError(applicationResult.error.userMessage)
        }
        if (transactionResult.ok) setTransactions(transactionResult.data)
        else setError(transactionResult.error.userMessage)
      }
    )
    const unsubscribe = onPackageTransactionUpdate((nextTransactions) => {
      setTransactions(nextTransactions)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedId) ?? null,
    [applications, selectedId]
  )

  async function refreshApplications(): Promise<void> {
    const result = await listApplications()
    if (result.ok) {
      setApplications(result.data)
      setSelectedId((current) => current ?? result.data[0]?.id ?? null)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleDiscover(): Promise<void> {
    setBusy(true)
    const result = await discoverApplications()
    setBusy(false)
    if (result.ok) {
      setApplications(result.data)
      setSelectedId(result.data[0]?.id ?? null)
      setStatus(`Discovered ${result.data.length} application records.`)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleRegisterAppImage(): Promise<void> {
    setBusy(true)
    const result = await registerAppImage()
    setBusy(false)
    if (result.ok) {
      if (result.data) {
        await refreshApplications()
        setSelectedId(result.data.id)
        setStatus(`Registered ${result.data.name}.`)
      } else {
        setStatus('AppImage registration cancelled.')
      }
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleLaunch(): Promise<void> {
    if (!selectedApplication) return
    setBusy(true)
    const result = await launchApplication({ id: selectedApplication.id })
    setBusy(false)
    if (result.ok) {
      await refreshApplications()
      setStatus(
        result.data.message ?? (result.data.launched ? 'Launch requested.' : 'Launch failed.')
      )
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleRemove(): Promise<void> {
    if (!selectedApplication) return
    setBusy(true)
    const result = await removeApplication({ id: selectedApplication.id })
    setBusy(false)
    if (result.ok) {
      const nextApplications = applications.filter(
        (application) => application.id !== selectedApplication.id
      )
      setApplications(nextApplications)
      setSelectedId(nextApplications[0]?.id ?? null)
      setStatus(`Removed ${selectedApplication.name} from NeuroDeck.`)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleFlatpakSearch(): Promise<void> {
    const query = flatpakQuery.trim()
    if (!query) return
    setBusy(true)
    const result = await searchFlatpak({ query })
    setBusy(false)
    if (result.ok) {
      setFlatpakResults(result.data)
      setSelectedFlatpakRef(result.data[0]?.ref ?? null)
      setPermissionPreview(null)
      setStatus(`Flatpak search returned ${result.data.length} results.`)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handlePreviewPermissions(ref: string): Promise<void> {
    setSelectedFlatpakRef(ref)
    setBusy(true)
    const result = await previewFlatpakPermissions({ ref })
    setBusy(false)
    if (result.ok) {
      setPermissionPreview(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  async function runFlatpakAction(action: 'install' | 'update' | 'uninstall'): Promise<void> {
    if (!selectedFlatpakRef) return
    setBusy(true)
    const result =
      action === 'install'
        ? await installFlatpak({ ref: selectedFlatpakRef })
        : action === 'update'
          ? await updateFlatpak({ ref: selectedFlatpakRef })
          : await uninstallFlatpak({ ref: selectedFlatpakRef })
    setBusy(false)
    if (result.ok) {
      setTransactions((current) => [
        result.data,
        ...current.filter((item) => item.id !== result.data.id)
      ])
      setStatus(`${result.data.label}: ${result.data.status}.`)
      setError(null)
      await refreshApplications()
    } else {
      setError(result.error.userMessage)
    }
  }

  return (
    <div className="grid h-full min-w-0 grid-cols-1 gap-2 overflow-hidden deck:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.4fr)] docked:grid-cols-[20rem_minmax(0,1fr)_22rem]">
      <NdxToolWindow title="Application Library" subtitle={`${applications.length} registered`}>
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <ControllerButton variant="primary" disabled={busy} onClick={handleDiscover}>
              Discover
            </ControllerButton>
            <ControllerButton variant="secondary" disabled={busy} onClick={handleRegisterAppImage}>
              Register AppImage
            </ControllerButton>
          </div>
          {applications.length === 0 ? (
            <EmptyState
              title="No applications registered"
              description="Run discovery or register a verified AppImage."
              className="min-h-48 rounded-sm border border-border bg-surface"
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto pr-1">
              {applications.map((application, index) => (
                <ApplicationRow
                  key={application.id}
                  application={application}
                  index={index}
                  selected={application.id === selectedId}
                  onSelect={() => setSelectedId(application.id)}
                />
              ))}
            </div>
          )}
        </div>
      </NdxToolWindow>

      <NdxEditorShell title="Application Center">
        <div className="flex min-h-full min-w-0 flex-col gap-4 overflow-auto p-3 deck:p-4">
          <div>
            <p className="text-meta uppercase tracking-wide text-text-tertiary">Epic X2</p>
            <h1 className="mt-1 text-title font-semibold text-text-primary">
              Applications and Packages
            </h1>
          </div>

          {error && <ErrorState title="Application Center error" description={error} />}
          {status && <p className="text-meta text-status-success">{status}</p>}

          {selectedApplication ? (
            <section className="rounded-sm ndx-settings-section">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-title font-semibold text-text-primary">
                    {selectedApplication.name}
                  </p>
                  <p className="break-all text-meta text-text-secondary">
                    {selectedApplication.executableRef ?? 'No executable reference'}
                  </p>
                </div>
                <StatusBadge
                  tone={selectedApplication.installed ? 'success' : 'warning'}
                  label={selectedApplication.installed ? 'Installed' : 'Not installed'}
                />
              </div>

              <dl className="mt-3 grid gap-2 text-meta text-text-secondary md:grid-cols-2">
                <div>
                  <dt className="font-semibold text-text-primary">Source</dt>
                  <dd>{selectedApplication.source}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-text-primary">Launch mode</dt>
                  <dd>{selectedApplication.launchMode}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-text-primary">Last launched</dt>
                  <dd>{formatTime(selectedApplication.lastLaunchedAt)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-text-primary">Controller profile</dt>
                  <dd>{selectedApplication.controllerProfileId ?? 'Default / unmanaged'}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="font-semibold text-text-primary">Launch arguments</dt>
                  <dd>{selectedApplication.launchArguments.join(' ') || 'None'}</dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap gap-2">
                <ControllerButton variant="primary" disabled={busy} onClick={handleLaunch}>
                  Launch
                </ControllerButton>
                <ControllerButton variant="destructive" disabled={busy} onClick={handleRemove}>
                  Remove record
                </ControllerButton>
              </div>
            </section>
          ) : (
            <EmptyState
              title="Select an application"
              description="Application records come from real discovery adapters or verified AppImages."
              className="rounded-sm border border-border bg-surface"
            />
          )}

          <section className="rounded-sm ndx-settings-section">
            <p className="text-body font-semibold text-text-primary">Flatpak Package Center</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={flatpakQuery}
                onChange={(event) => setFlatpakQuery(event.target.value)}
                placeholder="Search Flathub or configured remotes"
                className="min-h-[var(--ndx-target-min)] min-w-0 flex-1 rounded-sm border border-border bg-canvas px-3 text-body text-text-primary"
              />
              <ControllerButton variant="primary" disabled={busy} onClick={handleFlatpakSearch}>
                Search
              </ControllerButton>
            </div>

            {flatpakResults.length === 0 ? (
              <p className="mt-3 text-meta text-text-secondary">
                No remote package results loaded. Machines without Flatpak report that honestly.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {flatpakResults.map((app) => (
                  <button
                    key={app.ref}
                    type="button"
                    className={`rounded-sm border p-3 text-left ${
                      selectedFlatpakRef === app.ref
                        ? 'border-border-focus bg-surface-raised'
                        : 'border-border bg-canvas'
                    }`}
                    onClick={() => void handlePreviewPermissions(app.ref)}
                  >
                    <span className="block text-body font-semibold text-text-primary">
                      {app.name}
                    </span>
                    <span className="block break-all text-meta text-text-secondary">{app.ref}</span>
                    <span className="block text-meta text-text-tertiary">
                      {app.remote}
                      {app.version ? ` / ${app.version}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3">
              <PermissionPreview preview={permissionPreview} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <ControllerButton
                variant="primary"
                disabled={busy || !selectedFlatpakRef}
                onClick={() => void runFlatpakAction('install')}
              >
                Install Flatpak
              </ControllerButton>
              <ControllerButton
                variant="secondary"
                disabled={busy || !selectedFlatpakRef}
                onClick={() => void runFlatpakAction('update')}
              >
                Update
              </ControllerButton>
              <ControllerButton
                variant="destructive"
                disabled={busy || !selectedFlatpakRef}
                onClick={() => void runFlatpakAction('uninstall')}
              >
                Uninstall
              </ControllerButton>
            </div>
          </section>
        </div>
      </NdxEditorShell>

      <div className="hidden min-h-0 docked:block">
        <NdxToolWindow title="Package Transactions" subtitle={`${transactions.length} tracked`}>
          <TransactionList transactions={transactions} />
        </NdxToolWindow>
      </div>
    </div>
  )
}
