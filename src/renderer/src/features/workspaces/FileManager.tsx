import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { File, Folder } from 'lucide-react'
import type { FileEntry } from '@shared/contracts'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../../components/primitives/cn'
import { NdxEditorShell } from '../../components/workbench'
import { deleteFile, listFiles } from '../../services/ipc/fileClient'
import { useShareSheet } from '../../state/useShareSheet'
import { FilePreview } from './FilePreview'
import { WorkspaceRequiredState } from './WorkspaceRequiredState'
import { useWorkspaces } from './useWorkspaces'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'

function resolveAbsolutePath(rootPath: string, relativePath: string): string {
  const separator = rootPath.includes('\\') && !rootPath.includes('/') ? '\\' : '/'
  const trimmedRoot = rootPath.endsWith(separator) ? rootPath.slice(0, -1) : rootPath
  const normalizedRelative = relativePath.replace(/\\/g, separator).replace(/\//g, separator)
  return `${trimmedRoot}${separator}${normalizedRelative}`
}

/**
 * ND-026 File Manager, scoped to workspace-only browsing with real
 * path-traversal-protected IPC. The layout is Deck-first: file navigation is
 * available in the main surface at 1280x800 and becomes a side explorer on
 * wide docked displays.
 */
export function FileManager(): React.JSX.Element {
  const navigate = useNavigate()
  const { openShareSheet } = useShareSheet()
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

  const setPrimary = useWorkbenchStore((state) => state.setPrimary)

  useEffect(() => {
    if (!activeWorkspace) {
      setPrimary('Command Deck', undefined, null)
      return
    }
    setPrimary(
      'Explorer',
      activeWorkspace.name,
      <div className="flex h-full flex-col p-3">
        <ExplorerPanel
          workspaceName={activeWorkspace.name}
          relativePath={relativePath}
          entries={entries}
          error={error}
          loading={loading}
          onNavigate={setRelativePath}
          onOpen={openEntry}
          onDelete={(entry) => setDeleteReview(entry)}
          onSendViaLanShare={(entry) =>
            navigate('/lan-share/send', {
              state: {
                sourcePaths: [resolveAbsolutePath(activeWorkspace.rootPath, entry.path)]
              }
            })
          }
          onShare={(entry) =>
            openShareSheet({
              filePaths: [resolveAbsolutePath(activeWorkspace.rootPath, entry.path)],
              sourceLabel: entry.name
            })
          }
        />
      </div>
    )
    return () => setPrimary('Command Deck', undefined, null)
  }, [activeWorkspace, relativePath, entries, error, loading, navigate, openShareSheet, setPrimary])

  if (!activeWorkspace) {
    return <WorkspaceRequiredState purpose="browse and manage files" />
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
    <div className="h-full bg-[var(--ndx-workbench-editor-bg)]">
      <NdxEditorShell title={selectedFile ?? 'File Preview'}>
        <FilePreview workspaceId={activeWorkspace.id} relativePath={selectedFile} />
      </NdxEditorShell>
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

function ExplorerPanel({
  workspaceName,
  relativePath,
  entries,
  error,
  loading,
  onNavigate,
  onOpen,
  onDelete,
  onSendViaLanShare,
  onShare
}: {
  workspaceName: string
  relativePath: string
  entries: FileEntry[]
  error: string | null
  loading: boolean
  onNavigate: (path: string) => void
  onOpen: (entry: FileEntry) => void
  onDelete: (entry: FileEntry) => void
  onSendViaLanShare: (entry: FileEntry) => void
  onShare: (entry: FileEntry) => void
}): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div>
        <p className="text-meta font-semibold uppercase tracking-wide text-text-tertiary">
          Explorer
        </p>
        <p className="truncate text-meta text-text-secondary">{workspaceName}</p>
      </div>
      <Breadcrumbs relativePath={relativePath} onNavigate={onNavigate} />
      {error && <ErrorState title="Couldn't list this folder" description={error} />}
      {loading ? (
        <p className="text-meta text-text-secondary">Loading...</p>
      ) : entries.length === 0 ? (
        <EmptyState title="Empty folder" />
      ) : (
        <ul className="flex min-h-0 flex-col gap-1 overflow-auto">
          {entries.map((entry) => (
            <FileRow
              key={entry.path}
              entry={entry}
              onOpen={() => onOpen(entry)}
              onDelete={entry.isDirectory ? undefined : () => onDelete(entry)}
              onSendViaLanShare={entry.isDirectory ? undefined : () => onSendViaLanShare(entry)}
              onShare={entry.isDirectory ? undefined : () => onShare(entry)}
            />
          ))}
        </ul>
      )}
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
    <div className="flex flex-wrap items-center gap-1 text-meta text-text-secondary">
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

function EntryIcon({ isDirectory }: { isDirectory: boolean }): React.JSX.Element {
  const Icon = isDirectory ? Folder : File
  return (
    <Icon
      aria-hidden
      className={cn(
        'size-4 shrink-0',
        isDirectory ? 'text-[var(--ndx-accent)]' : 'text-text-tertiary'
      )}
    />
  )
}

function FileRow({
  entry,
  onOpen,
  onDelete,
  onSendViaLanShare,
  onShare
}: {
  entry: FileEntry
  onOpen: () => void
  onDelete?: () => void
  onSendViaLanShare?: () => void
  onShare?: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `file:${entry.path}`,
    groupId: 'file-manager',
    onActivate: onOpen
  })

  return (
    <li className="grid grid-cols-1 gap-1">
      <button
        ref={ref}
        type="button"
        onClick={onOpen}
        data-selected={isFocused}
        className={cn(
          'ndx-workbench-row flex min-h-[var(--ndx-target-min)] items-center justify-between px-2 text-left text-meta text-text-primary',
          isFocused && 'border-[var(--ndx-workbench-border-active)]'
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <EntryIcon isDirectory={entry.isDirectory} />
          <span className="truncate">{entry.name}</span>
        </span>
        {!entry.isDirectory && (
          <span className="shrink-0 pl-2 text-meta text-text-tertiary">
            {formatBytes(entry.sizeBytes)}
          </span>
        )}
      </button>
      {(onSendViaLanShare || onShare || onDelete) && (
        <div className="flex flex-wrap gap-1">
          {onSendViaLanShare && (
            <ControllerButton variant="secondary" onClick={onSendViaLanShare}>
              Send via LAN Share
            </ControllerButton>
          )}
          {onShare && (
            <ControllerButton variant="secondary" onClick={onShare}>
              Share
            </ControllerButton>
          )}
          {onDelete && (
            <ControllerButton variant="destructive" onClick={onDelete}>
              Delete
            </ControllerButton>
          )}
        </div>
      )}
    </li>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
