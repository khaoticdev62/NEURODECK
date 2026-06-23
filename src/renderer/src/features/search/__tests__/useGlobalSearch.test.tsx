import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, Workspace } from '@shared/contracts'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { useGlobalSearch } from '../useGlobalSearch'

const ACTIVE_WORKSPACE: Workspace = {
  id: 'w1',
  name: 'project-one',
  rootPath: '/home/deck/project-one',
  createdAt: Date.now()
}

function stubBridge(
  partial: Partial<NdxBridge> | ((base: NdxBridge) => Partial<NdxBridge>) = {}
): void {
  const base = {
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
    }
  } as unknown as NdxBridge
  const overrides = typeof partial === 'function' ? partial(base) : partial
  window.ndx = {
    ...base,
    ...overrides,
    workspaces: { ...base.workspaces, ...overrides.workspaces },
    files: { ...base.files, ...overrides.files },
    git: { ...base.git, ...overrides.git },
    terminal: { ...base.terminal, ...overrides.terminal },
    workflows: { ...base.workflows, ...overrides.workflows },
    workflowRuns: { ...base.workflowRuns, ...overrides.workflowRuns },
    agents: { ...base.agents, ...overrides.agents },
    agentRuns: { ...base.agentRuns, ...overrides.agentRuns },
    modelProviders: { ...base.modelProviders, ...overrides.modelProviders },
    recovery: { ...base.recovery, ...overrides.recovery },
    browserTabs: { ...base.browserTabs, ...overrides.browserTabs },
    remoteHosts: { ...base.remoteHosts, ...overrides.remoteHosts },
    remoteSessions: { ...base.remoteSessions, ...overrides.remoteSessions }
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

function SearchHarness({
  activeWorkspace
}: {
  activeWorkspace: Workspace | null
}): React.JSX.Element {
  const { query, setQuery, results, loading, category, setCategory } =
    useGlobalSearch(activeWorkspace)
  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search"
      />
      <div data-testid="loading">{loading ? 'loading' : 'idle'}</div>
      <div data-testid="category">{category}</div>
      <button type="button" onClick={() => setCategory('files')}>
        Files
      </button>
      <button type="button" onClick={() => setCategory('code')}>
        Code
      </button>
      <ul>
        {results.map((result) => (
          <li key={result.id} data-testid={`result-${result.source}`}>
            {result.title}
          </li>
        ))}
      </ul>
    </div>
  )
}

function renderHarness(value: WorkspaceContextValue): ReturnType<typeof render> {
  return render(
    <WorkspaceContext.Provider value={value}>
      <SearchHarness activeWorkspace={value.activeWorkspace} />
    </WorkspaceContext.Provider>
  )
}

describe('useGlobalSearch', () => {
  // Real timers: the hook debounces by 200 ms; waitFor handles the delay.

  it('starts empty and idle', () => {
    stubBridge()
    renderHarness(makeValue())
    expect(screen.getByTestId('loading')).toHaveTextContent('idle')
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('returns federated results after debounce', async () => {
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

    renderHarness(makeValue())
    const input = screen.getByLabelText('Search')
    fireEvent.change(input, { target: { value: 'readme' } })

    await waitFor(
      () => {
        expect(screen.getByText('README.md')).toBeInTheDocument()
      },
      { timeout: 1500 }
    )
    expect(screen.getByTestId('result-file')).toBeInTheDocument()
  })

  it('filters by category', async () => {
    stubBridge((base) => ({
      files: {
        ...base.files,
        list: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              name: 'index.ts',
              path: '/index.ts',
              isDirectory: false,
              sizeBytes: 200,
              modifiedAt: Date.now()
            }
          ]
        })
      },
      git: {
        ...base.git,
        status: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            isRepository: true,
            branch: 'main',
            ahead: 0,
            behind: 0,
            changes: [{ path: 'index.ts', status: '.M', staged: false }],
            hasConflicts: false
          }
        })
      }
    }))

    renderHarness(makeValue())
    const input = screen.getByLabelText('Search')
    fireEvent.change(input, { target: { value: 'index' } })

    await waitFor(() => expect(screen.queryAllByRole('listitem').length).toBeGreaterThan(0), {
      timeout: 1500
    })

    fireEvent.click(screen.getByRole('button', { name: 'Files' }))
    await waitFor(() => {
      expect(screen.getByText('index.ts')).toBeInTheDocument()
      expect(screen.queryByTestId('result-git-change')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    await waitFor(() => {
      expect(screen.getAllByText('index.ts')).toHaveLength(2)
      expect(screen.getByTestId('result-git-change')).toBeInTheDocument()
    })
  })

  it('reports source errors without crashing', async () => {
    stubBridge({
      files: {
        list: vi.fn().mockResolvedValue({
          ok: false,
          error: { code: 'FILES_LIST_FAILED', userMessage: 'Could not list files' }
        }),
        read: vi.fn(),
        write: vi.fn(),
        delete: vi.fn()
      }
    })

    renderHarness(makeValue())
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'x' } })

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('idle')
    })
  })
})
