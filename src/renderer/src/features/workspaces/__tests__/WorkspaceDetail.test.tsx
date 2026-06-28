import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkspaceContext, type WorkspaceContextValue } from '../WorkspaceContext'
import { WorkspaceDetail } from '../WorkspaceDetail'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function makeValue(overrides: Partial<WorkspaceContextValue> = {}): WorkspaceContextValue {
  return {
    workspaces: [],
    activeWorkspaceId: null,
    activeWorkspace: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
    addFromPicker: vi.fn(),
    remove: vi.fn(),
    setActive: vi.fn(),
    ...overrides
  }
}

function renderDetail(value: WorkspaceContextValue): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <MemoryRouter>
            <WorkspaceContext.Provider value={value}>
              <WorkspaceDetail />
            </WorkspaceContext.Provider>
          </MemoryRouter>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('WorkspaceDetail', () => {
  it('shows the "no active workspace" empty state when nothing is active', () => {
    renderDetail(makeValue())
    expect(screen.getByText('No active workspace')).toBeInTheDocument()
  })

  it('shows real workspace metadata in the Overview tab', () => {
    const createdAt = Date.now()
    renderDetail(
      makeValue({
        activeWorkspace: {
          id: 'w1',
          name: 'my-project',
          rootPath: '/home/deck/my-project',
          createdAt
        }
      })
    )

    expect(screen.getByText('my-project')).toBeInTheDocument()
    expect(screen.getByText('/home/deck/my-project')).toBeInTheDocument()
    expect(screen.getByText(new Date(createdAt).toLocaleString())).toBeInTheDocument()
  })

  it('switches to the real File Manager when the Files tab is activated', async () => {
    stubBridge({
      files: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }), read: vi.fn() } as never
    })

    const user = userEvent.setup()
    renderDetail(
      makeValue({
        activeWorkspace: {
          id: 'w1',
          name: 'my-project',
          rootPath: '/home/deck/my-project',
          createdAt: Date.now()
        }
      })
    )

    await user.click(screen.getByRole('button', { name: 'Files' }))

    expect(await screen.findByText('Empty folder')).toBeInTheDocument()
  })

  it('switches to the real Git view when the Git tab is activated', async () => {
    const status = vi.fn().mockResolvedValue({
      ok: true,
      data: { isRepository: true, branch: 'main', ahead: 0, behind: 0, changes: [] }
    })
    stubBridge({
      git: {
        status,
        branches: vi.fn().mockResolvedValue({
          ok: true,
          data: [{ name: 'main', current: true }]
        }),
        log: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        remotes: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        stashList: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    const user = userEvent.setup()
    renderDetail(
      makeValue({
        activeWorkspace: {
          id: 'w1',
          name: 'my-project',
          rootPath: '/home/deck/my-project',
          createdAt: Date.now()
        }
      })
    )

    await user.click(screen.getByRole('button', { name: 'Git' }))

    expect(await screen.findByText('main', { selector: 'span' })).toBeInTheDocument()
    expect(status).toHaveBeenCalledWith({ workspaceId: 'w1' })
  })
})
