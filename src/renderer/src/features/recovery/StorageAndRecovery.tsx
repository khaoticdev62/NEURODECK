import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SystemMetricsSnapshot } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { formatBytes as formatBytesUnit } from '../../components/primitives/formatBytes'
import { NdxMeter } from '../../components/primitives/NdxMeter'
import { ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { getRecoveryStorageSummary } from '../../services/ipc/recoveryClient'
import { collectSystemMetrics } from '../../services/ipc/systemClient'
import { WorkspaceRequiredState } from '../workspaces/WorkspaceRequiredState'
import { useWorkspaces } from '../workspaces/useWorkspaces'

/**
 * ND-047 Storage and Recovery. Recovery checkpoint storage and real disk
 * usage (`SystemMetricsService`, Epic X9 — since real, unlike when this
 * screen was first scoped) are both real. Model storage, workspace cache,
 * browser data, logs, and trash still need a service that doesn't exist yet
 * (Epic 9's model runtime, Epic 10's browser, a real log-file inventory) —
 * showing fabricated numbers for them would violate the "no one-click magic
 * cleanup that hides what's being deleted" rule by definition, since
 * there'd be nothing real to show in the first place.
 */
export function StorageAndRecovery(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<{ checkpointCount: number; totalBytes: number } | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<SystemMetricsSnapshot | null>(null)

  useEffect(() => {
    if (!activeWorkspace) return
    let active = true
    void getRecoveryStorageSummary({ workspaceId: activeWorkspace.id }).then((result) => {
      if (!active) return
      if (result.ok) {
        setSummary(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [activeWorkspace])

  useEffect(() => {
    let active = true
    void collectSystemMetrics().then((result) => {
      if (active && result.ok) setMetrics(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  if (!activeWorkspace) {
    return <WorkspaceRequiredState purpose="see its recovery storage" />
  }

  return (
    <div className="grid h-full min-w-[64rem] grid-cols-[18rem_minmax(32rem,1fr)_18rem] gap-2 overflow-auto">
      <NdxToolWindow title="Storage Scope" subtitle={activeWorkspace.name}>
        <p className="text-meta text-text-secondary">
          This slice is scoped to real recovery checkpoint storage for the active workspace.
        </p>
        <div className="border-t border-border pt-3">
          <p className="text-meta font-semibold text-text-primary">Workspace</p>
          <p className="break-all text-meta text-text-tertiary">{activeWorkspace.rootPath}</p>
        </div>
      </NdxToolWindow>

      <NdxEditorShell title="Storage and Recovery">
        <div className="flex min-h-full flex-col gap-4 p-4">
          <p className="text-title font-semibold text-text-primary">Storage and Recovery</p>

          {error && <ErrorState title="Couldn't load recovery storage" description={error} />}

          <section className="ndx-settings-section">
            <p className="mb-1 text-meta font-semibold text-text-primary">Recovery points</p>
            {summary ? (
              <p className="text-meta text-text-secondary">
                {summary.checkpointCount} checkpoint{summary.checkpointCount === 1 ? '' : 's'} ·{' '}
                {formatBytes(summary.totalBytes)} of snapshots
              </p>
            ) : (
              <p className="text-meta text-text-secondary">Loading…</p>
            )}
            <ControllerButton
              variant="primary"
              className="mt-2"
              onClick={() => navigate('/recovery')}
            >
              Open Recovery Timeline
            </ControllerButton>
          </section>

          <section className="ndx-settings-section">
            <p className="mb-2 text-meta font-semibold text-text-primary">Disk usage</p>
            {metrics?.storage.available && metrics.storage.value ? (
              <NdxMeter
                label={metrics.storage.value.path}
                percent={metrics.storage.value.usagePercent}
                displayValue={`${formatBytesUnit(metrics.storage.value.usedBytes)} / ${formatBytesUnit(metrics.storage.value.totalBytes)}`}
              />
            ) : (
              <p className="text-meta text-text-secondary">Loading…</p>
            )}
          </section>

          <section className="border border-dashed border-border bg-canvas/40 p-3">
            <p className="mb-1 text-meta font-semibold text-text-tertiary">
              Model storage, workspace cache, browser data, logs, and trash
            </p>
            <p className="text-meta text-text-tertiary">
              Not real yet — each needs a service this epic doesn&apos;t own (Epic 9&apos;s model
              runtime, Epic 10&apos;s browser, a real log-file inventory).
            </p>
          </section>
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Storage Policy" subtitle="Recovery only" side="right">
        <p className="text-meta text-text-tertiary">
          Cleanup and storage totals remain disabled until each storage class has a real inventory
          and review path.
        </p>
      </NdxToolWindow>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
