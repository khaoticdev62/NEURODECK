import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ndxError, type NdxResult, type Workspace } from '@shared/contracts'
import {
  createWorkspace,
  listWorkspaces,
  pickWorkspaceFolder,
  removeWorkspace
} from '../../services/ipc/workspaceClient'
import { WorkspaceContext, type WorkspaceContextValue } from './WorkspaceContext'

const ACTIVE_WORKSPACE_KEY_NONE = null
const WORKSPACE_LOAD_TIMEOUT_MS = 1500

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
 * workspace the shell is currently scoped to) — it is not yet persisted
 * across app restarts, since that needs the "UI resume state" piece of
 * mega-prompt §19's workspace record, deferred until something else
 * (Epic 8's task state, Epic 6's terminal sessions) needs resuming too.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const workspaceLoadTimeoutMs = getWorkspaceLoadTimeoutMs()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    ACTIVE_WORKSPACE_KEY_NONE
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
    setActiveWorkspaceId(created.data.id)
  }, [refresh])

  const remove = useCallback(
    async (id: string) => {
      const result = await removeWorkspace(id)
      if (!result.ok) {
        setError(result.error.userMessage)
        return
      }
      if (activeWorkspaceId === id) setActiveWorkspaceId(null)
      await refresh()
    },
    [refresh, activeWorkspaceId]
  )

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  )

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
      setActive: setActiveWorkspaceId
    }),
    [workspaces, activeWorkspaceId, activeWorkspace, loading, error, refresh, addFromPicker, remove]
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
