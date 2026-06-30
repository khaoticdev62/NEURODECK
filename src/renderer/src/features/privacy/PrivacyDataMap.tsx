import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DataMapEntry } from '@shared/contracts'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxSpatialLockup, NdxToolWindow } from '../../components/workbench'
import { clearPrivacyDataCategory, getPrivacyDataMap } from '../../services/ipc/privacyClient'

/**
 * Epic X12 Data Lifecycle and Privacy Map (supplemental spec §37.1).
 * Every row reflects a real store this codebase has — see
 * `PrivacyDataMapService`'s doc comment for which spec-named
 * categories (sync, cloud processing, analytics, crash reports) are
 * honestly omitted because no real subsystem backs them yet. Clearing
 * a category re-reads the store afterward to show a genuine
 * verification result (spec §37.2), never an assumed success.
 */
export function PrivacyDataMap(): React.JSX.Element {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<DataMapEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearReview, setClearReview] = useState<DataMapEntry | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)

  async function refresh(): Promise<void> {
    const result = await getPrivacyDataMap()
    if (result.ok) {
      setEntries(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  useEffect(() => {
    let active = true
    void getPrivacyDataMap().then((result) => {
      if (!active) return
      if (result.ok) setEntries(result.data)
      else setError(result.error.userMessage)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleClear(entry: DataMapEntry): Promise<void> {
    setClearReview(null)
    const result = await clearPrivacyDataCategory({ id: entry.id })
    if (result.ok) {
      setLastResult(
        `${entry.label}: cleared ${result.data.clearedCount} item${
          result.data.clearedCount === 1 ? '' : 's'
        } — ${result.data.verifiedEmpty ? 'verified empty' : 'not fully verified'}.`
      )
      await refresh()
    } else {
      setError(result.error.userMessage)
    }
  }

  if (error) return <ErrorState title="Privacy and Data Map error" description={error} />
  if (loading) return <p className="p-4 text-meta text-text-secondary">Loading data map…</p>

  return (
    <div className="grid h-full min-w-[76rem] grid-cols-[minmax(44rem,1fr)_20rem] gap-2 overflow-auto">
      <NdxEditorShell title="Privacy Data Map">
        <div className="flex min-h-full min-w-0 flex-col gap-4 overflow-auto p-4">
          <p className="text-title font-semibold text-text-primary">Privacy and Data Map</p>
          <p className="text-meta text-text-secondary">
            Every real data category NeuroDeck stores, where it lives, and what control you have
            over it.
          </p>

          {lastResult && <p className="text-meta text-status-success">{lastResult}</p>}

          <div className="grid gap-3 xl:grid-cols-2">
            {entries.map((entry) => (
              <NdxSpatialLockup key={entry.id}>
                <article>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-meta font-semibold text-text-primary">{entry.label}</p>
                      <p className="text-caption text-text-tertiary">{entry.storageLocation}</p>
                    </div>
                    {entry.itemCount !== null && (
                      <span className="text-caption text-text-tertiary">
                        {entry.itemCount} item{entry.itemCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  <dl className="mt-2 grid grid-cols-2 gap-1 text-caption text-text-secondary">
                    <dt>Encryption</dt>
                    <dd>{entry.encrypted ? 'Encrypted at rest' : 'Not encrypted'}</dd>
                    <dt>Retention</dt>
                    <dd>{entry.retention}</dd>
                    <dt>Sync</dt>
                    <dd>{entry.syncStatus}</dd>
                    <dt>Export</dt>
                    <dd>{entry.exportSupport}</dd>
                    <dt>Provider involvement</dt>
                    <dd>{entry.providerInvolvement}</dd>
                  </dl>

                  <p className="mt-2 text-caption text-text-tertiary">
                    {entry.deleteControlDetail}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.deleteControl === 'available-here' && (
                      <ControllerButton variant="destructive" onClick={() => setClearReview(entry)}>
                        Clear
                      </ControllerButton>
                    )}
                    {entry.deleteControl === 'available-elsewhere' && entry.linkedRoute && (
                      <ControllerButton onClick={() => navigate(entry.linkedRoute as string)}>
                        Manage
                      </ControllerButton>
                    )}
                    {entry.deleteControl === 'not-applicable' && (
                      <span className="text-caption text-text-tertiary opacity-60">
                        No delete control needed
                      </span>
                    )}
                  </div>
                </article>
              </NdxSpatialLockup>
            ))}
          </div>
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Deletion Policy" subtitle={`${entries.length} categories`} side="right">
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Each category reflects a real store; missing subsystems are not represented.</p>
          <p>Clear actions re-read the backing store before reporting verification.</p>
        </div>
      </NdxToolWindow>

      <ConfirmationDialog
        open={clearReview !== null}
        title="Clear data category"
        action={`Clear all ${clearReview?.label ?? 'data'}`}
        scope={clearReview ? `${clearReview.itemCount ?? 0} item(s)` : undefined}
        consequence="This permanently removes every stored item in this category. It cannot be undone."
        confirmLabel="Clear"
        onConfirm={() => {
          if (clearReview) void handleClear(clearReview)
        }}
        onCancel={() => setClearReview(null)}
      />
    </div>
  )
}
