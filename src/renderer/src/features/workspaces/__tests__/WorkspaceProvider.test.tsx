import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { WorkspaceProvider } from '../WorkspaceProvider'
import { useWorkspaces } from '../useWorkspaces'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function Probe(): React.JSX.Element {
  const { workspaces, loading, error } = useWorkspaces()
  return (
    <div>
      <span>loading: {String(loading)}</span>
      <span>error: {error ?? 'none'}</span>
      <span>count: {workspaces.length}</span>
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
})
