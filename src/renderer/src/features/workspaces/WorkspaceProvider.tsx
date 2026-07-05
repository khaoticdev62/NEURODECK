import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ndxError, type NdxResult, type Workspace } from '@shared/contracts'
import {
  createWorkspace,
  listWorkspaces,
  pickWorkspaceFolder,
  removeWorkspace
} from '../../services/ipc/workspaceClient'
import { WorkspaceContext, type WorkspaceContextValue } from './WorkspaceContext'

const ACTIVE_WORKSPACE_STORAGE_KEY = 'ndx.workspaces.activeWorkspaceId'
const WORKSPACE_LOAD_TIMEOUT_MS = 1500

function readPersistedActiveWorkspaceId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY)
  } catch {
    // Storage access can be blocked (privacy modes, corrupted profile). The
    // selection is best-effort UI state — losing it only costs the restored
    // choice on next launch, so degrade to "no persisted selection".
    return null
  }
}

function persistActiveWorkspaceId(id: string | null): void {
  try {
    if (id === null) {
      window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY)
    } else {
      window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, id)
    }
  } catch {
    // Same best-effort contract as readPersistedActiveWorkspaceId above.
  }
}

function getWorkspaceLoadTimeoutMs(): number {
  return Number(import.meta.env.VITE_WORKSPACE_LOAD_TIMEOUT_MS ?? WORKSPACE_LOAD_TIMEOUT_MS)
}

function listWorkspacesWithTimeout(timeoutMs: number): Promise<NdxResult<Workspace[]>> {
  return Promise.race([
    listWorkspaces(),
    new Promise<NdxResult<Workspace[]>>((resolve) => {
      window.setTimeout(() => {
        resolve({
          ok: false,
          error: ndxError(
            'timeout',
            'WORKSPACE_LOAD_TIMEOUT',
            `Workspace registry timed out after ${timeoutMs}ms.`,
            {
              message: 'Workspace list IPC did not resolve before the renderer timeout.',
              retryable: true
            }
          )
        })
      }, timeoutMs)
    })
  ])
}

/**
 * Real workspace state, backed by the IPC layer Epic 5 built (no fake
 * workspace list). "Active workspace" is renderer-only UI state (which
 * workspace the shell is currently scoped to). The selection is persisted
 * to localStorage and restored on launch; when the persisted choice is
 * missing or stale, the first registered workspace is auto-selected so
 * workspace-scoped screens never dead-end behind a manual activation step —
 * the only state with no active workspace is a genuinely empty registry.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const workspaceLoadTimeoutMs = getWorkspaceLoadTimeoutMs()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    readPersistedActiveWorkspaceId
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // `listWorkspaces()` is expected to resolve to a structured NdxResult,
  // never reject — but the underlying `ipcRenderer.invoke` call can reject
  // (no handler registered, a main-process crash, a non-cloneable payload).
  // An uncaught rejection here used to leave `loading` stuck at `true`
  // forever, since neither `refresh()`'s `await` nor the mount effect's
  // `.then()` had a rejection handler — the workspace-scoped UI would show
  // "loading" indefinitely with no error and no way to recover short of an
  // app restart. Both call sites now convert a rejection into the same
  // degraded, recoverable error state a resolved `{ ok: false }` already is.
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listWorkspacesWithTimeout(workspaceLoadTimeoutMs)
      if (result.ok) {
        setWorkspaces(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load workspace state.')
    } finally {
      setLoading(false)
    }
  }, [workspaceLoadTimeoutMs])

  // Deliberately not `refresh()` here: that function sets state synchronously
  // (`setLoading(true)`) before its first `await`, which the React Compiler
  // lint flags as a synchronous setState-in-effect. Inlining the fetch keeps
  // every setState call inside the `.then()` continuation — genuinely async,
  // not synchronous work disguised by an `await`.
  useEffect(() => {
    let cancelled = false
    void listWorkspacesWithTimeout(workspaceLoadTimeoutMs)
      .then((result) => {
        if (cancelled) return
        if (result.ok) {
          setWorkspaces(result.data)
          setError(null)
        } else {
          setError(result.error.userMessage)
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setError(error instanceof Error ? error.message : 'Could not load workspace state.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [workspaceLoadTimeoutMs])

  const setActive = useCallback((id: string) => {
    persistActiveWorkspaceId(id)
    setSelectedWorkspaceId(id)
  }, [])

  const addFromPicker = useCallback(async () => {
    const picked = await pickWorkspaceFolder()
    if (!picked.ok) {
      setError(picked.error.userMessage)
      return
    }
    if (picked.data === null) return // user cancelled the dialog

    const created = await createWorkspace({ rootPath: picked.data })
    if (!created.ok) {
      setError(created.error.userMessage)
      return
    }
    setError(null)
    await refresh()
    setActive(created.data.id)
  }, [refresh, setActive])

  const remove = useCallback(
    async (id: string) => {
      const result = await removeWorkspace(id)
      if (!result.ok) {
        setError(result.error.userMessage)
        return
      }
      if (selectedWorkspaceId === id) {
        // Clear the explicit selection; the derived fallback below scopes the
        // shell to the next remaining workspace (or none when the list empties).
        persistActiveWorkspaceId(null)
        setSelectedWorkspaceId(null)
      }
      await refresh()
    },
    [refresh, selectedWorkspaceId]
  )

  // Derived, never stored: the explicit selection when it still exists,
  // otherwise the first registered workspace. Deriving (rather than
  // reconciling in an effect) means there is no render where workspaces
  // exist but none is active.
  const activeWorkspace = useMemo(() => {
    if (workspaces.length === 0) return null
    return workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? workspaces[0]
  }, [workspaces, selectedWorkspaceId])

  const activeWorkspaceId = activeWorkspace?.id ?? null

  const value: WorkspaceContextValue = useMemo(
    () => ({
      workspaces,
      activeWorkspaceId,
      activeWorkspace,
      loading,
      error,
      refresh,
      addFromPicker,
      remove,
      setActive
    }),
    [
      workspaces,
      activeWorkspaceId,
      activeWorkspace,
      loading,
      error,
      refresh,
      addFromPicker,
      remove,
      setActive
    ]
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
