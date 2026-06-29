import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScreenshotRecord, ScreenshotSource } from '@shared/contracts'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import {
  addScreenshotToWorkspace,
  captureScreenshot,
  copyScreenshotToClipboard,
  deleteScreenshot,
  listScreenshots
} from '../../services/ipc/screenshotClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'

const DELAY_OPTIONS = [0, 3, 5, 10]

/**
 * Epic X14 Screenshot Center (supplemental spec §42.1), scoped to
 * "Current window" and "Full screen" — see `ScreenshotService`'s doc
 * comment for why region select, annotation, redaction, and Ask AI
 * are deliberately not offered here. "Share" reuses the existing real
 * LAN Share Send Composer rather than building a second send flow.
 */
export function ScreenshotCenter(): React.JSX.Element {
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspaces()
  const [screenshots, setScreenshots] = useState<ScreenshotRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [delaySeconds, setDelaySeconds] = useState(0)
  const [deleteReview, setDeleteReview] = useState<ScreenshotRecord | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function refresh(): Promise<void> {
    const result = await listScreenshots()
    if (result.ok) {
      setScreenshots(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  useEffect(() => {
    let active = true
    void listScreenshots().then((result) => {
      if (!active) return
      if (result.ok) setScreenshots(result.data)
      else setError(result.error.userMessage)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleCapture(source: ScreenshotSource): Promise<void> {
    setCapturing(true)
    setStatus(null)
    const result = await captureScreenshot({ source, delaySeconds })
    setCapturing(false)
    if (result.ok) {
      await refresh()
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleCopy(record: ScreenshotRecord): Promise<void> {
    const result = await copyScreenshotToClipboard({ id: record.id })
    setStatus(result.ok ? 'Copied to clipboard.' : null)
    if (!result.ok) setError(result.error.userMessage)
  }

  async function handleDelete(record: ScreenshotRecord): Promise<void> {
    setDeleteReview(null)
    const result = await deleteScreenshot({ id: record.id })
    if (result.ok) await refresh()
    else setError(result.error.userMessage)
  }

  async function handleAddToWorkspace(record: ScreenshotRecord): Promise<void> {
    if (!activeWorkspace) return
    const result = await addScreenshotToWorkspace({
      id: record.id,
      workspaceId: activeWorkspace.id
    })
    setStatus(result.ok ? `Added to workspace as ${result.data}.` : null)
    if (!result.ok) setError(result.error.userMessage)
  }

  function handleShare(record: ScreenshotRecord): void {
    navigate('/lan-share/send', { state: { sourcePaths: [record.path] } })
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <p className="text-title font-semibold text-text-primary">Screenshot Center</p>

      {error && <ErrorState title="Screenshot error" description={error} />}
      {status && <p className="text-meta text-status-success">{status}</p>}

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-meta font-semibold text-text-primary">Capture</p>
        <div className="flex items-center gap-2">
          <span className="text-meta text-text-secondary">Delay:</span>
          {DELAY_OPTIONS.map((seconds) => (
            <ControllerButton
              key={seconds}
              variant={delaySeconds === seconds ? 'primary' : 'secondary'}
              onClick={() => setDelaySeconds(seconds)}
            >
              {seconds === 0 ? 'None' : `${seconds}s`}
            </ControllerButton>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <ControllerButton
            variant="primary"
            disabled={capturing}
            onClick={() => void handleCapture('current-window')}
          >
            {capturing ? 'Capturing…' : 'Capture current window'}
          </ControllerButton>
          <ControllerButton disabled={capturing} onClick={() => void handleCapture('full-screen')}>
            {capturing ? 'Capturing…' : 'Capture full screen'}
          </ControllerButton>
        </div>
      </section>

      <section className="grid gap-3">
        {loading ? (
          <p className="text-meta text-text-secondary">Loading screenshots…</p>
        ) : screenshots.length === 0 ? (
          <EmptyState
            title="No screenshots yet"
            description="Capture the current window or full screen to get started."
          />
        ) : (
          screenshots.map((record) => (
            <article key={record.id} className="border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-meta font-semibold text-text-primary">
                    {record.source === 'full-screen' ? 'Full screen' : 'Current window'}
                  </p>
                  <p className="text-caption text-text-tertiary">
                    {new Date(record.capturedAt).toLocaleString()} · {formatBytes(record.bytes)}
                  </p>
                  <p className="mt-1 break-all text-caption text-text-tertiary">{record.path}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ControllerButton onClick={() => void handleCopy(record)}>Copy</ControllerButton>
                <ControllerButton onClick={() => handleShare(record)}>
                  Share via LAN Share
                </ControllerButton>
                <ControllerButton
                  disabled={!activeWorkspace}
                  onClick={() => void handleAddToWorkspace(record)}
                >
                  Add to workspace
                </ControllerButton>
                <ControllerButton variant="destructive" onClick={() => setDeleteReview(record)}>
                  Delete
                </ControllerButton>
              </div>
            </article>
          ))
        )}
      </section>

      <ConfirmationDialog
        open={deleteReview !== null}
        title="Delete screenshot"
        action="Delete this screenshot"
        scope={deleteReview?.path}
        consequence="This permanently removes the screenshot file from disk."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteReview) void handleDelete(deleteReview)
        }}
        onCancel={() => setDeleteReview(null)}
      />
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
