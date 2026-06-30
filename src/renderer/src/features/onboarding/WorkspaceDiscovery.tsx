import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DiscoveredWorkspace, WorkspaceDiscoverySource } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxSpatialLockup } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import {
  createWorkspace,
  discoverWorkspaces,
  pickWorkspaceFolder
} from '../../services/ipc/workspaceClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'

interface SourceToggleDef {
  id: WorkspaceDiscoverySource
  label: string
  description: string
}

const SOURCES: SourceToggleDef[] = [
  {
    id: 'home',
    label: 'Home projects',
    description: 'Folders in your home directory with project markers'
  },
  {
    id: 'git',
    label: 'Git repositories',
    description: 'Local Git repositories up to two levels deep'
  },
  { id: 'ssh', label: 'SSH hosts', description: 'Saved remote hosts from Remote Systems' },
  { id: 'removable', label: 'Removable storage', description: 'Mounted USB drives and SD cards' },
  {
    id: 'steam',
    label: 'Steam library',
    description: 'Installed Steam games with valid install folders'
  }
]

const SOURCE_LABELS: Record<WorkspaceDiscoverySource, string> = {
  home: 'Home',
  git: 'Git',
  ssh: 'SSH',
  removable: 'Removable',
  steam: 'Steam'
}

/**
 * ND-006 Workspace Discovery. Scans multiple real sources and lets the user
 * add discovered folders as workspaces. Unsupported sources (e.g. SSH) are
 * surfaced for awareness but cannot be added as local workspaces.
 */
export function WorkspaceDiscovery(): React.JSX.Element {
  const navigate = useNavigate()
  const { workspaces, refresh } = useWorkspaces()
  const [selected, setSelected] = useState<Set<WorkspaceDiscoverySource>>(
    () => new Set(SOURCES.map((s) => s.id))
  )
  const [discovered, setDiscovered] = useState<DiscoveredWorkspace[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { ref: scanRef, isFocused: scanFocused } = useFocusable<HTMLButtonElement>({
    id: 'workspace-discovery:scan',
    groupId: 'workspace-discovery',
    priority: 1,
    initialFocus: true,
    onActivate: () => void handleScan()
  })

  const existingPaths = useMemo(() => new Set(workspaces.map((w) => w.rootPath)), [workspaces])

  const handleScan = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDiscovered(null)
    const result = await discoverWorkspaces({ sources: Array.from(selected) })
    setLoading(false)
    if (result.ok) {
      setDiscovered(result.data)
    } else {
      setError(result.error.userMessage)
    }
  }, [selected])

  useEffect(() => {
    void handleScan()
  }, [handleScan])

  const handleAdd = useCallback(
    async (item: DiscoveredWorkspace) => {
      const result = await createWorkspace({ rootPath: item.rootPath })
      if (!result.ok) {
        setError(result.error.userMessage)
        return
      }
      await refresh()
    },
    [refresh]
  )

  const handleManualAdd = useCallback(async () => {
    const result = await pickWorkspaceFolder()
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    if (result.data === null) return
    const created = await createWorkspace({ rootPath: result.data })
    if (!created.ok) {
      setError(created.error.userMessage)
      return
    }
    await refresh()
  }, [refresh])

  const toggleSource = useCallback((id: WorkspaceDiscoverySource) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setDiscovered(null)
  }, [])

  const isAddable = useCallback(
    (item: DiscoveredWorkspace) => {
      if (item.source === 'ssh') return false
      return !existingPaths.has(item.rootPath)
    },
    [existingPaths]
  )

  return (
    <div className="flex h-full flex-col gap-4 p-8">
      <div className="text-center">
        <p className="text-display font-semibold text-text-primary">Workspace Discovery</p>
        <p className="text-body text-text-secondary">
          Find projects across your device and add them as workspaces.
        </p>
      </div>

      {error && <ErrorState title="Discovery error" description={error} />}

      <div className="flex flex-wrap justify-center gap-2">
        {SOURCES.map((source) => (
          <SourceToggle
            key={source.id}
            source={source}
            selected={selected.has(source.id)}
            onToggle={() => toggleSource(source.id)}
          />
        ))}
      </div>

      <div className="flex justify-center gap-2">
        <ControllerButton
          ref={scanRef}
          variant="primary"
          disabled={selected.size === 0 || loading}
          className={scanFocused ? 'ring-2 ring-border-focus' : undefined}
          onClick={() => void handleScan()}
        >
          {loading ? 'Scanning…' : 'Scan'}
        </ControllerButton>
        <ControllerButton variant="secondary" onClick={() => void handleManualAdd()}>
          Add manually
        </ControllerButton>
        <ControllerButton variant="ghost" onClick={() => navigate('/onboarding/calibration')}>
          Skip
        </ControllerButton>
      </div>

      <div className="flex-1 overflow-auto">
        {discovered === null || loading ? (
          <EmptyState
            className="h-full"
            title="Ready to scan"
            description="Choose sources above and press Scan to discover workspaces."
          />
        ) : discovered.length === 0 ? (
          <EmptyState
            className="h-full"
            title="No workspaces found"
            description="Try selecting different sources or add a folder manually."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {discovered.map((item) => (
              <DiscoveredCard
                key={item.id}
                item={item}
                isAdded={!isAddable(item) && item.source !== 'ssh'}
                onAdd={() => void handleAdd(item)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-center">
        <ControllerButton variant="primary" onClick={() => navigate('/onboarding/calibration')}>
          Continue
        </ControllerButton>
      </div>
    </div>
  )
}

function SourceToggle({
  source,
  selected,
  onToggle
}: {
  source: SourceToggleDef
  selected: boolean
  onToggle: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `workspace-discovery:source:${source.id}`,
    groupId: 'workspace-discovery-sources',
    onActivate: onToggle
  })

  return (
    <ControllerButton
      ref={ref}
      variant={selected ? 'primary' : 'secondary'}
      aria-pressed={selected}
      className={isFocused ? 'ring-2 ring-border-focus' : undefined}
      onClick={onToggle}
      title={source.description}
    >
      {source.label}
    </ControllerButton>
  )
}

function DiscoveredCard({
  item,
  isAdded,
  onAdd
}: {
  item: DiscoveredWorkspace
  isAdded: boolean
  onAdd: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLLIElement>({
    id: `workspace-discovery:item:${item.id}`,
    groupId: 'workspace-discovery-results',
    onActivate: onAdd
  })

  return (
    <li ref={ref} tabIndex={-1} className="flex flex-col">
      <NdxSpatialLockup selected={isFocused}>
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-body font-semibold text-text-primary">{item.name}</p>
              <p className="text-meta text-text-secondary">{item.rootPath}</p>
            </div>
            <StatusBadge tone="info" label={SOURCE_LABELS[item.source]} />
          </div>
          {item.reason && <p className="text-meta text-text-secondary">{item.reason}</p>}
          <div className="mt-1 flex gap-2">
            {item.source === 'ssh' ? (
              <ControllerButton variant="ghost" disabled aria-label={`${item.name} is remote only`}>
                Remote only
              </ControllerButton>
            ) : isAdded ? (
              <ControllerButton variant="ghost" disabled aria-label={`${item.name} already added`}>
                Added
              </ControllerButton>
            ) : (
              <ControllerButton variant="primary" onClick={onAdd} aria-label={`Add ${item.name}`}>
                Add
              </ControllerButton>
            )}
          </div>
        </div>
      </NdxSpatialLockup>
    </li>
  )
}
