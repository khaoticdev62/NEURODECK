import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { WorkspaceProvider } from '../WorkspaceProvider'
import { useWorkspaces } from '../useWorkspaces'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
  delete import.meta.env.VITE_WORKSPACE_LOAD_TIMEOUT_MS
  window.localStorage.clear()
})

function Probe(): React.JSX.Element {
  const { workspaces, loading, error, activeWorkspace, setActive } = useWorkspaces()
  return (
    <div>
      <span>loading: {String(loading)}</span>
      <span>error: {error ?? 'none'}</span>
      <span>count: {workspaces.length}</span>
      <span>active: {activeWorkspace?.id ?? 'none'}</span>
      <button onClick={() => setActive('w2')}>activate w2</button>
    </div>
  )
}

describe('WorkspaceProvider', () => {
  it('settles loading to false and surfaces a real error when the workspace IPC call rejects', async () => {
    // A rejected promise (e.g. a dropped IPC invoke) is a different failure
    // shape than a resolved `{ ok: false }` result. The mount effect used to
    // have no `.catch()`, so a rejection left `loading` stuck at `true`
    // forever with no error shown — the workspace-scoped UI would spin
    // indefinitely with no way to recover short of an app restart.
    window.ndx = {
      workspaces: {
        list: vi.fn(() => Promise.reject(new Error('No handler registered for workspace:list')))
      } as never
    } as Partial<NdxBridge> as NdxBridge

    render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('loading: false')).toBeInTheDocument()
    })
    expect(screen.getByText('error: No handler registered for workspace:list')).toBeInTheDocument()
    expect(screen.getByText('count: 0')).toBeInTheDocument()
  })

  it('settles loading to false normally when the workspace IPC call resolves', async () => {
    window.ndx = {
      workspaces: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          data: [{ id: 'w1', name: 'Project', rootPath: '/workspace/project', createdAt: 1 }]
        })
      } as never
    } as Partial<NdxBridge> as NdxBridge

    render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('loading: false')).toBeInTheDocument()
    })
    expect(screen.getByText('error: none')).toBeInTheDocument()
    expect(screen.getByText('count: 1')).toBeInTheDocument()
  })

  it('settles loading to false when the workspace IPC call hangs', async () => {
    import.meta.env.VITE_WORKSPACE_LOAD_TIMEOUT_MS = '20'
    window.ndx = {
      workspaces: {
        list: vi.fn(() => new Promise(() => undefined))
      } as never
    } as Partial<NdxBridge> as NdxBridge

    render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('loading: false')).toBeInTheDocument()
    })
    expect(screen.getByText('error: Workspace registry timed out after 20ms.')).toBeInTheDocument()
    expect(screen.getByText('count: 0')).toBeInTheDocument()
  })

  it('auto-selects the first workspace when nothing is persisted', async () => {
    // Screens must never dead-end behind a manual "open a workspace" step —
    // if any workspace exists, one is active from the first settled render.
    window.ndx = {
      workspaces: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            { id: 'w1', name: 'First', rootPath: '/workspace/first', createdAt: 1 },
            { id: 'w2', name: 'Second', rootPath: '/workspace/second', createdAt: 2 }
          ]
        })
      } as never
    } as Partial<NdxBridge> as NdxBridge

    render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('active: w1')).toBeInTheDocument()
    })
  })

  it('restores the persisted active workspace across mounts and falls back when it is stale', async () => {
    window.ndx = {
      workspaces: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            { id: 'w1', name: 'First', rootPath: '/workspace/first', createdAt: 1 },
            { id: 'w2', name: 'Second', rootPath: '/workspace/second', createdAt: 2 }
          ]
        })
      } as never
    } as Partial<NdxBridge> as NdxBridge

    const { unmount } = render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    )
    await waitFor(() => {
      expect(screen.getByText('active: w1')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('activate w2'))
    await waitFor(() => {
      expect(screen.getByText('active: w2')).toBeInTheDocument()
    })
    unmount()

    // Remount: the persisted selection (w2) wins over the first-item fallback.
    render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    )
    await waitFor(() => {
      expect(screen.getByText('active: w2')).toBeInTheDocument()
    })

    // A stale persisted id (workspace since removed) degrades to the first
    // remaining workspace rather than no selection.
    window.localStorage.setItem('ndx.workspaces.activeWorkspaceId', 'gone')
    const remount = render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    )
    await waitFor(() => {
      expect(remount.getByText('active: w1')).toBeInTheDocument()
    })
  })
})
