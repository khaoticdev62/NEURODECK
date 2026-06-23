import { useEffect, useState } from 'react'
import type { FileEntry } from '@shared/contracts'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../../components/primitives/cn'
import { deleteFile, listFiles } from '../../services/ipc/fileClient'
import { FilePreview } from './FilePreview'
import { useWorkspaces } from './useWorkspaces'

/**
 * ND-026 File Manager, scoped to "Workspace-only" mode (one of six layout
 * modes the spec lists) — real directory listing for the active workspace,
 * via the real path-traversal-protected `FileService`, plus a real Delete
 * for single files: `FileService.delete()` is recovery-checkpointed by
 * `registerFileHandlers.ts` before it runs, the same orchestration
 * `fileWrite` already uses. Copy/move/rename/compress/extract remain out
 * of scope — each touches two paths or an archive boundary and needs a
 * real multi-path checkpoint shape this slice doesn't design. Deleting a
 * directory is not supported (the button doesn't appear for one).
 */
export function FileManager(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()
  const [relativePath, setRelativePath] = useState('')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(activeWorkspace))
  const [deleteReview, setDeleteReview] = useState<FileEntry | null>(null)

  const refresh = (): void => {
    if (!activeWorkspace) return
    void listFiles({ workspaceId: activeWorkspace.id, relativePath }).then((result) => {
      if (result.ok) {
        setEntries(result.data)
        setError(null)
      } else {
        setEntries([])
        setError(result.error.userMessage)
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    if (!activeWorkspace) return
    let cancelled = false
    void listFiles({ workspaceId: activeWorkspace.id, relativePath }).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setEntries(result.data)
        setError(null)
      } else {
        setEntries([])
        setError(result.error.userMessage)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [activeWorkspace, relativePath])

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="No active workspace"
        description="Open a workspace from the Workspace Hub to browse its files."
      />
    )
  }

  function openEntry(entry: FileEntry): void {
    if (entry.isDirectory) {
      setRelativePath(entry.path)
      setSelectedFile(null)
    } else {
      setSelectedFile(entry.path)
    }
  }

  const performDelete = async (entry: FileEntry): Promise<void> => {
    const result = await deleteFile({ workspaceId: activeWorkspace.id, relativePath: entry.path })
    setDeleteReview(null)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    if (selectedFile === entry.path) setSelectedFile(null)
    setError(null)
    refresh()
  }

  return (
    <div className="flex h-full gap-4">
      <div className="flex w-1/2 flex-col gap-2">
        <Breadcrumbs relativePath={relativePath} onNavigate={setRelativePath} />
        {error && <ErrorState title="Couldn't list this folder" description={error} />}
        {loading ? (
          <p className="text-meta text-text-secondary">Loading…</p>
        ) : entries.length === 0 ? (
          <EmptyState title="Empty folder" />
        ) : (
          <ul className="flex flex-col gap-1 overflow-auto">
            {entries.map((entry) => (
              <FileRow
                key={entry.path}
                entry={entry}
                onOpen={() => openEntry(entry)}
                onDelete={entry.isDirectory ? undefined : () => setDeleteReview(entry)}
              />
            ))}
          </ul>
        )}
      </div>
      <div className="w-1/2">
        <FilePreview workspaceId={activeWorkspace.id} relativePath={selectedFile} />
      </div>
      <ConfirmationDialog
        open={deleteReview !== null}
        title="Delete file"
        action={`Delete ${deleteReview?.name ?? 'this file'}`}
        scope={deleteReview?.path}
        consequence="This permanently removes the file from the workspace. A recovery checkpoint of its current content is recorded first, so it can still be restored from Recovery Timeline."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteReview) void performDelete(deleteReview)
        }}
        onCancel={() => setDeleteReview(null)}
      />
    </div>
  )
}

function Breadcrumbs({
  relativePath,
  onNavigate
}: {
  relativePath: string
  onNavigate: (path: string) => void
}): React.JSX.Element {
  const segments = relativePath ? relativePath.split(/[/\\]/) : []
  return (
    <div className="flex items-center gap-1 text-meta text-text-secondary">
      <button type="button" onClick={() => onNavigate('')} className="hover:text-text-primary">
        Workspace
      </button>
      {segments.map((segment, index) => {
        const pathUpToHere = segments.slice(0, index + 1).join('/')
        return (
          <span key={pathUpToHere} className="flex items-center gap-1">
            <span>/</span>
            <button
              type="button"
              onClick={() => onNavigate(pathUpToHere)}
              className="hover:text-text-primary"
            >
              {segment}
            </button>
          </span>
        )
      })}
    </div>
  )
}

function FileRow({
  entry,
  onOpen,
  onDelete
}: {
  entry: FileEntry
  onOpen: () => void
  onDelete?: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `file:${entry.path}`,
    groupId: 'file-manager',
    onActivate: onOpen
  })

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
      <button
        ref={ref}
        type="button"
        onClick={onOpen}
        className={cn(
          'flex min-h-[var(--ndx-target-min)] items-center justify-between rounded-md px-3 text-left text-body text-text-primary',
          isFocused ? 'bg-surface-raised' : 'hover:bg-surface-raised/60'
        )}
      >
        <span>{entry.isDirectory ? `📁 ${entry.name}` : entry.name}</span>
        {!entry.isDirectory && (
          <span className="text-meta text-text-tertiary">{formatBytes(entry.sizeBytes)}</span>
        )}
      </button>
      {onDelete && (
        <ControllerButton variant="destructive" onClick={onDelete}>
          Delete
        </ControllerButton>
      )}
    </li>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
