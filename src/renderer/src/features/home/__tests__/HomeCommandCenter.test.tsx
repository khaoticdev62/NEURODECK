import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, Workspace } from '@shared/contracts'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { DisplaySettingsProvider } from '../../../state/displaySettings'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { HomeCommandCenter } from '../HomeCommandCenter'

const WORKSPACE: Workspace = {
  id: 'workspace-1',
  name: 'Neurodeck',
  rootPath: 'C:\\Projects\\Neurodeck',
  createdAt: 1
}

function installBridge(): void {
  Object.defineProperty(window, 'ndx', {
    configurable: true,
    value: {
      workflows: {
        list: vi.fn(async () => ({
          ok: true,
          data: [
            {
              id: 'workflow-1',
              workspaceId: WORKSPACE.id,
              name: 'Release Train',
              description: '',
              steps: [],
              version: 0,
              createdAt: 1,
              updatedAt: 1
            }
          ]
        }))
      },
      workflowRuns: {
        list: vi.fn(async () => ({
          ok: true,
          data: [
            {
              id: 'run-1',
              workflowId: 'workflow-1',
              workspaceId: WORKSPACE.id,
              status: 'running',
              steps: [],
              context: {},
              startedAt: 1
            }
          ]
        }))
      },
      agents: {
        list: vi.fn(async () => ({
          ok: true,
          data: [
            {
              id: 'agent-1',
              name: 'Reviewer',
              role: 'Review',
              goal: 'Find risks',
              workspaceId: WORKSPACE.id,
              modelProfile: 'balanced',
              toolAllowlist: [],
              permissionCeiling: [],
              resourceLimits: {
                maxTokens: 4096,
                timeoutMs: 30000,
                maxToolCalls: 5
              },
              childAgentPolicy: {
                allowChildAgents: false,
                maxChildrenPerRun: 0,
                maxDepth: 0
              },
              enabled: true,
              createdAt: 1,
              updatedAt: 1
            }
          ]
        }))
      },
      agentRuns: {
        list: vi.fn(async () => ({
          ok: true,
          data: [
            {
              id: 'agent-run-1',
              agentId: 'agent-1',
              workspaceId: WORKSPACE.id,
              objective: 'Review',
              state: 'running',
              timeline: [],
              dryRun: false,
              createdAt: 1,
              updatedAt: 1
            }
          ]
        }))
      }
    } as unknown as NdxBridge
  })
}

function clearBridge(): void {
  Object.defineProperty(window, 'ndx', {
    configurable: true,
    value: undefined
  })
}

function makeWorkspaceValue(overrides: Partial<WorkspaceContextValue> = {}): WorkspaceContextValue {
  return {
    workspaces: [],
    activeWorkspaceId: null,
    activeWorkspace: null,
    loading: false,
    error: null,
    refresh: vi.fn(async () => undefined),
    addFromPicker: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    setActive: vi.fn(),
    ...overrides
  }
}

function renderHome(workspaceValue = makeWorkspaceValue()): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <DisplaySettingsProvider>
          <WorkspaceContext.Provider value={workspaceValue}>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route path="/" element={<HomeCommandCenter />} />
                <Route path="/workspaces" element={<p>Workspaces placeholder</p>} />
                <Route path="/workspaces/detail" element={<p>Workspace detail placeholder</p>} />
                <Route path="/learn" element={<p>Learn placeholder</p>} />
                <Route path="/agents" element={<p>Agents placeholder</p>} />
              </Routes>
            </MemoryRouter>
          </WorkspaceContext.Provider>
        </DisplaySettingsProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('HomeCommandCenter', () => {
  afterEach(() => {
    clearBridge()
  })

  it("renders the spec's defined empty state when no workspaces exist", () => {
    renderHome()
    expect(screen.getByText('Create or discover a workspace')).toBeInTheDocument()
  })

  it('"Open folder" navigates to the Workspace Hub', async () => {
    const user = userEvent.setup()
    renderHome()

    await user.click(screen.getByRole('button', { name: 'Open folder' }))

    expect(screen.getByText('Workspaces placeholder')).toBeInTheDocument()
  })

  it('renders real workspace-aware home sections from existing services', async () => {
    installBridge()
    renderHome(
      makeWorkspaceValue({
        workspaces: [WORKSPACE],
        activeWorkspaceId: WORKSPACE.id,
        activeWorkspace: WORKSPACE
      })
    )

    expect(screen.getByText('Active workspace: Neurodeck')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    expect(await screen.findByText('Workflows')).toBeInTheDocument()
    expect(screen.getByText('Agents')).toBeInTheDocument()
    expect(screen.getByText('Workflow runs')).toBeInTheDocument()
    expect(screen.getByText('Agent runs')).toBeInTheDocument()
    expect(screen.getByText('Create workflow')).toBeInTheDocument()
    expect(screen.getByText('Review approvals')).toBeInTheDocument()
  })

  it('continues into the active workspace detail route', async () => {
    installBridge()
    const user = userEvent.setup()
    const setActive = vi.fn()
    renderHome(
      makeWorkspaceValue({
        workspaces: [WORKSPACE],
        activeWorkspaceId: WORKSPACE.id,
        activeWorkspace: WORKSPACE,
        setActive
      })
    )

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(setActive).toHaveBeenCalledWith(WORKSPACE.id)
    expect(screen.getByText('Workspace detail placeholder')).toBeInTheDocument()
  })

  it('routes recommendations to real destinations', async () => {
    installBridge()
    const user = userEvent.setup()
    renderHome(
      makeWorkspaceValue({
        workspaces: [WORKSPACE],
        activeWorkspaceId: WORKSPACE.id,
        activeWorkspace: WORKSPACE
      })
    )

    await user.click(screen.getByRole('button', { name: /Create agent/ }))

    expect(screen.getByText('Agents placeholder')).toBeInTheDocument()
  })
})
