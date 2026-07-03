import { useEffect, useState } from 'react'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { readFile } from '../../services/ipc/fileClient'

export interface FilePreviewProps {
  workspaceId: string
  relativePath: string | null
}

/**
 * ND-027 File Preview, scoped to "Text/code" today — the only preview type
 * that's honestly real without dedicated renderers for the rest of the
 * spec's list (Markdown rendering, images, PDF, audio, video, archive
 * contents, diff). Showing raw text for those instead of a fake rich
 * preview is the accurate thing to do until each gets its own renderer.
 */
export function FilePreview({ workspaceId, relativePath }: FilePreviewProps): React.JSX.Element {
  const [content, setContent] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(relativePath))

  useEffect(() => {
    if (!relativePath) return // the render below already ignores stale content/error once relativePath is null

    let cancelled = false
    void readFile({ workspaceId, relativePath }).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setContent(result.data.content)
        setTruncated(result.data.truncated)
        setError(null)
      } else {
        setContent(null)
        setError(result.error.userMessage)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [workspaceId, relativePath])

  if (!relativePath) {
    return (
      <EmptyState
        title="No file selected"
        description="Choose a file to preview its contents here."
      />
    )
  }

  if (loading) {
    return <p className="p-4 text-meta text-text-secondary">Loading…</p>
  }

  if (error) {
    return <ErrorState title="Couldn't open this file" description={error} />
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto">
      <p className="text-meta text-text-secondary">{relativePath}</p>
      {truncated && (
        <p className="text-meta text-status-warning">
          Showing the first part of this file — it&apos;s too large to preview in full.
        </p>
      )}
      <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded-md ndx-settings-section text-meta text-text-primary">
        {content}
      </pre>
    </div>
  )
}
