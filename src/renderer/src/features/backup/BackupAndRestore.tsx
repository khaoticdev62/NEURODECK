import { useEffect, useState } from 'react'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import {
  createBackup,
  listBackups,
  restoreBackup,
  verifyBackup
} from '../../services/ipc/backupClient'
import type { BackupRecord, BackupRestoreResult, BackupVerification } from '@shared/contracts'

export function BackupAndRestore(): React.JSX.Element {
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verification, setVerification] = useState<BackupVerification | null>(null)
  const [restoreReview, setRestoreReview] = useState<BackupRecord | null>(null)
  const [restoreResult, setRestoreResult] = useState<BackupRestoreResult | null>(null)

  useEffect(() => {
    let active = true
    void listBackups().then((result) => {
      if (!active) return
      if (result.ok) {
        setBackups(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleCreate(): Promise<void> {
    setBusy(true)
    const result = await createBackup({ label: 'Manual app-state backup' })
    if (result.ok) {
      setBackups((current) => [result.data, ...current])
      setVerification(null)
      setRestoreResult(null)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
    setBusy(false)
  }

  async function handleRestore(record: BackupRecord): Promise<void> {
    setRestoreReview(null)
    setBusy(true)
    const result = await restoreBackup({ id: record.id })
    if (result.ok) {
      const refreshed = await listBackups()
      if (refreshed.ok) setBackups(refreshed.data)
      setRestoreResult(result.data)
      setVerification(null)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
    setBusy(false)
  }

  async function handleVerify(record: BackupRecord): Promise<void> {
    setBusy(true)
    const result = await verifyBackup({ id: record.id })
    if (result.ok) {
      setVerification(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
    setBusy(false)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-title font-semibold text-text-primary">Backup and Restore</p>
          <p className="text-meta text-text-secondary">
            Local app-state backups with manifest verification and secret-store exclusion.
          </p>
        </div>
        <ControllerButton variant="primary" onClick={handleCreate} disabled={busy}>
          Create Backup
        </ControllerButton>
      </header>

      {error && <ErrorState title="Backup request failed" description={error} />}

      {verification && (
        <section className="border border-border bg-surface p-3">
          <p className="text-meta font-semibold text-text-primary">
            Verification {verification.ok ? 'passed' : 'failed'}
          </p>
          <p className="text-meta text-text-secondary">
            Checked {new Date(verification.checkedAt).toLocaleString()}
          </p>
          {verification.failures.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-meta text-status-error">
              {verification.failures.map((failure) => (
                <li key={failure}>{failure}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {restoreResult && (
        <section className="border border-status-success/40 bg-status-success/10 p-3">
          <p className="text-meta font-semibold text-status-success">Restore complete</p>
          <p className="text-meta text-text-secondary">
            Restored {restoreResult.restoredFileCount} file
            {restoreResult.restoredFileCount === 1 ? '' : 's'} and removed{' '}
            {restoreResult.removedFileCount} stale file
            {restoreResult.removedFileCount === 1 ? '' : 's'}. Rollback backup:{' '}
            {restoreResult.rollbackBackupId}
          </p>
          <p className="mt-1 break-all text-caption text-text-tertiary">
            {restoreResult.rollbackBackupPath}
          </p>
        </section>
      )}

      <section className="grid gap-3 overflow-auto">
        {loading ? (
          <p className="text-meta text-text-secondary">Loading backups...</p>
        ) : backups.length === 0 ? (
          <EmptyState
            title="No backups yet"
            description="Create a local backup to capture non-secret NeuroDeck app state."
          />
        ) : (
          backups.map((record) => (
            <article key={record.id} className="border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-meta font-semibold text-text-primary">
                    {record.label ?? 'App-state backup'}
                  </p>
                  <p className="text-meta text-text-secondary">
                    {new Date(record.createdAt).toLocaleString()} | {record.fileCount} files |{' '}
                    {formatBytes(record.totalBytes)}
                  </p>
                  <p className="mt-1 break-all text-caption text-text-tertiary">{record.path}</p>
                </div>
                <span className={record.verified ? 'text-status-success' : 'text-status-warning'}>
                  {record.verified ? 'Verified' : 'Needs check'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ControllerButton onClick={() => void handleVerify(record)} disabled={busy}>
                  Verify
                </ControllerButton>
                <ControllerButton
                  variant="destructive"
                  onClick={() => setRestoreReview(record)}
                  disabled={busy || !record.verified}
                >
                  Restore
                </ControllerButton>
              </div>
              <p className="mt-2 text-caption text-text-tertiary">
                Excludes secret stores: {record.excludedSecretPaths.join(', ')}
              </p>
            </article>
          ))
        )}
      </section>

      <ConfirmationDialog
        open={restoreReview !== null}
        title="Restore backup"
        action={`Restore "${restoreReview?.label ?? 'App-state backup'}"`}
        scope="Non-secret NeuroDeck app-state JSON files"
        consequence="Current app state files in this backup scope will be overwritten or removed to match the selected backup."
        recovery="A rollback backup of the current app state is created before restore, and a failed restore automatically re-applies it."
        confirmLabel="Restore"
        onConfirm={() => {
          if (restoreReview) void handleRestore(restoreReview)
        }}
        onCancel={() => setRestoreReview(null)}
      />
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
