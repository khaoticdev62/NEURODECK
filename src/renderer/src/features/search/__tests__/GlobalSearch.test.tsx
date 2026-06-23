import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { NdxBridge, Workspace } from '@shared/contracts'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { GlobalSearch } from '../GlobalSearch'

const ACTIVE_WORKSPACE: Workspace = {
  id: 'w1',
  name: 'project-one',
  rootPath: '/home/deck/project-one',
  createdAt: Date.now()
}

function stubBridge(partial: Partial<NdxBridge> = {}): void {
  window.ndx = {
    workspaces: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [ACTIVE_WORKSPACE] }),
      create: vi.fn(),
      remove: vi.fn(),
      pickFolder: vi.fn(),
      discover: vi.fn()
    },
    files: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      read: vi.fn(),
      write: vi.fn()
    },
    git: {
      status: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          isRepository: true,
          branch: 'main',
          ahead: 0,
          behind: 0,
          changes: [],
          hasConflicts: false
        }
      }),
      diff: vi.fn(),
      stage: vi.fn(),
      unstage: vi.fn(),
      commit: vi.fn(),
      branches: vi.fn(),
      checkout: vi.fn(),
      log: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      remotes: vi.fn(),
      fetch: vi.fn(),
      pull: vi.fn(),
      push: vi.fn(),
      stashSave: vi.fn(),
      stashList: vi.fn(),
      stashPop: vi.fn()
    },
    terminal: {
      create: vi.fn(),
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      snapshot: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      terminate: vi.fn(),
      onData: vi.fn(() => () => undefined),
      onExit: vi.fn(() => () => undefined)
    },
    workflows: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      save: vi.fn(),
      remove: vi.fn()
    },
    workflowRuns: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      create: vi.fn(),
      update: vi.fn()
    },
    agents: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      create: vi.fn(),
      update: vi.fn(),
      setEnabled: vi.fn(),
      remove: vi.fn()
    },
    agentRuns: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      get: vi.fn(),
      start: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      onUpdate: vi.fn(() => () => undefined)
    },
    modelProviders: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      add: vi.fn(),
      remove: vi.fn(),
      setEnabled: vi.fn(),
      route: vi.fn(),
      complete: vi.fn(),
      localStatus: vi.fn(),
      loadLocal: vi.fn(),
      unloadLocal: vi.fn(),
      benchmarkLocal: vi.fn(),
      testConnection: vi.fn()
    },
    recovery: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      diff: vi.fn(),
      restore: vi.fn(),
      storageSummary: vi.fn()
    },
    browserTabs: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      create: vi.fn(),
      setActive: vi.fn(),
      navigate: vi.fn(),
      goBack: vi.fn(),
      goForward: vi.fn(),
      reload: vi.fn(),
      setBounds: vi.fn(),
      remove: vi.fn(),
      openExternal: vi.fn(),
      onUpdate: vi.fn(() => () => undefined)
    },
    remoteHosts: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      add: vi.fn(),
      remove: vi.fn(),
      testConnection: vi.fn()
    },
    remoteSessions: {
      create: vi.fn(),
      snapshot: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      terminate: vi.fn(),
      onData: vi.fn(() => () => undefined),
      onExit: vi.fn(() => () => undefined)
    },
    ...partial
  } as unknown as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup
  delete window.ndx
  vi.useRealTimers()
})

function makeValue(overrides: Partial<WorkspaceContextValue> = {}): WorkspaceContextValue {
  return {
    workspaces: [ACTIVE_WORKSPACE],
    activeWorkspaceId: ACTIVE_WORKSPACE.id,
    activeWorkspace: ACTIVE_WORKSPACE,
    loading: false,
    error: null,
    refresh: vi.fn(),
    addFromPicker: vi.fn(),
    remove: vi.fn(),
    setActive: vi.fn(),
    ...overrides
  }
}

function renderSearch(): { adapter: TestAdapter; container: HTMLElement } & ReturnType<
  typeof render
> {
  const adapter = new TestAdapter()
  const result = render(
    <ToastProvider>
      <FocusEngineProvider adapters={[adapter]}>
        <WorkspaceContext.Provider value={makeValue()}>
          <MemoryRouter initialEntries={['/search']}>
            <Routes>
              <Route path="/search" element={<GlobalSearch />} />
              <Route path="/files" element={<div>Files screen</div>} />
              <Route path="/" element={<div>Home</div>} />
            </Routes>
          </MemoryRouter>
        </WorkspaceContext.Provider>
      </FocusEngineProvider>
    </ToastProvider>
  )
  return { ...result, adapter }
}

describe('GlobalSearch', () => {
  // Real timers: the screen debounces by 200 ms; waitFor handles the delay.

  it('renders the search header, input and categories', () => {
    stubBridge()
    renderSearch()
    expect(screen.getByRole('heading', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Search query' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Files' })).toBeInTheDocument()
  })

  it('shows matching results after typing', async () => {
    stubBridge({
      files: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              name: 'README.md',
              path: '/README.md',
              isDirectory: false,
              sizeBytes: 100,
              modifiedAt: Date.now()
            }
          ]
        }),
        read: vi.fn(),
        write: vi.fn(),
        delete: vi.fn()
      }
    })

    renderSearch()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search query' }), {
      target: { value: 'readme' }
    })

    await waitFor(
      () => {
        expect(screen.getByRole('option', { name: /README\.md/ })).toBeInTheDocument()
      },
      { timeout: 1500 }
    )
    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  it('navigates to a result when it is clicked', async () => {
    stubBridge({
      files: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              name: 'README.md',
              path: '/README.md',
              isDirectory: false,
              sizeBytes: 100,
              modifiedAt: Date.now()
            }
          ]
        }),
        read: vi.fn(),
        write: vi.fn(),
        delete: vi.fn()
      }
    })

    renderSearch()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search query' }), {
      target: { value: 'readme' }
    })

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /README\.md/ })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('option', { name: /README\.md/ }))

    await waitFor(() => {
      expect(screen.getByText('Files screen')).toBeInTheDocument()
    })
  })

  it('navigates via controller nav.down and confirm', async () => {
    stubBridge({
      files: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              name: 'README.md',
              path: '/README.md',
              isDirectory: false,
              sizeBytes: 100,
              modifiedAt: Date.now()
            }
          ]
        }),
        read: vi.fn(),
        write: vi.fn(),
        delete: vi.fn()
      }
    })

    const { adapter } = renderSearch()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search query' }), {
      target: { value: 'readme' }
    })

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /README\.md/ })).toBeInTheDocument()
    })

    adapter.inject('confirm')

    await waitFor(() => {
      expect(screen.getByText('Files screen')).toBeInTheDocument()
    })
  })
})
