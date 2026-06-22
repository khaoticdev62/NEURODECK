import { useEffect, useState } from 'react'
import type { FileEntry } from '@shared/contracts'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../../components/primitives/cn'
import { listFiles } from '../../services/ipc/fileClient'

export interface ProjectTreeProps {
  workspaceId: string
  onOpenFile: (path: string) => void
}

/** Real, lazily-expanded directory tree backed by the same path-traversal-protected `FileService` as File Manager (Epic 5) — no separate file-access path for Build Studio. */
export function ProjectTree({ workspaceId, onOpenFile }: ProjectTreeProps): React.JSX.Element {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, FileEntry[]>>({})

  useEffect(() => {
    let active = true
    void listFiles({ workspaceId, relativePath: '' }).then((result) => {
      if (!active) return
      if (result.ok) {
        setEntries(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [workspaceId])

  async function toggleExpand(entry: FileEntry): Promise<void> {
    if (expanded[entry.path]) {
      setExpanded((current) => {
        const next = { ...current }
        delete next[entry.path]
        return next
      })
      return
    }
    const result = await listFiles({ workspaceId, relativePath: entry.path })
    if (result.ok) {
      setExpanded((current) => ({ ...current, [entry.path]: result.data }))
    } else {
      setError(result.error.userMessage)
    }
  }

  if (error) return <ErrorState title="Couldn't load the project tree" description={error} />
  if (entries.length === 0) return <EmptyState title="Empty workspace" />

  return (
    <ul className="flex flex-col gap-0.5 overflow-auto">
      {entries.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          expandedChildren={expanded[entry.path]}
          onToggleExpand={toggleExpand}
          onOpenFile={onOpenFile}
          expanded={expanded}
        />
      ))}
    </ul>
  )
}

function TreeNode({
  entry,
  depth,
  expandedChildren,
  expanded,
  onToggleExpand,
  onOpenFile
}: {
  entry: FileEntry
  depth: number
  expandedChildren?: FileEntry[]
  expanded: Record<string, FileEntry[]>
  onToggleExpand: (entry: FileEntry) => void
  onOpenFile: (path: string) => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `build-tree:${entry.path}`,
    groupId: 'build-studio-tree',
    onActivate: () => (entry.isDirectory ? onToggleExpand(entry) : onOpenFile(entry.path))
  })

  return (
    <li>
      <button
        ref={ref}
        type="button"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => (entry.isDirectory ? onToggleExpand(entry) : onOpenFile(entry.path))}
        className={cn(
          'flex min-h-[1.75rem] w-full items-center gap-1 truncate text-left text-meta text-text-primary hover:bg-surface-raised/60'
        )}
      >
        {entry.isDirectory ? (expandedChildren ? '▾' : '▸') : '·'} {entry.name}
      </button>
      {expandedChildren && (
        <ul>
          {expandedChildren.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              expandedChildren={expanded[child.path]}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onOpenFile={onOpenFile}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
