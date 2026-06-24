import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, Workspace } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { useAiSafety } from '../../../ai-safety/useAiSafety'
import { ToastProvider } from '../../../components/overlays/Toast'
import type {
  ControllerAction,
  ControllerActionPhase
} from '../../../controller/adapters/controllerAction'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkspaceContext } from '../../workspaces/WorkspaceContext'
import { CommandPalette } from '../CommandPalette'

const WORKSPACE: Workspace = {
  id: 'workspace-1',
  name: 'Neurodeck',
  rootPath: 'C:\\Projects\\Neurodeck',
  createdAt: 1
}

function installBridge(overrides: Partial<NdxBridge> = {}): void {
  Object.defineProperty(window, 'ndx', {
    configurable: true,
    value: {
      files: {
        list: vi.fn(async () => ({
          ok: true,
          data: [
            {
              name: 'README.md',
              path: 'README.md',
              isDirectory: false,
              sizeBytes: 12,
              modifiedAt: 1
            }
          ]
        }))
      },
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
      ...overrides
    } as unknown as NdxBridge
  })
}

function clearBridge(): void {
  Object.defineProperty(window, 'ndx', {
    configurable: true,
    value: undefined
  })
}

/** adapter.inject() drives a real React state update outside of an event handler; act() makes the test wait for the resulting re-render. */
function inject(
  adapter: TestAdapter,
  action: ControllerAction,
  phase: ControllerActionPhase = 'press'
): void {
  act(() => adapter.inject(action, phase))
}

function WorkspaceHarness({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <WorkspaceContext.Provider
      value={{
        workspaces: [WORKSPACE],
        activeWorkspaceId: WORKSPACE.id,
        activeWorkspace: WORKSPACE,
        loading: false,
        error: null,
        refresh: vi.fn(async () => undefined),
        addFromPicker: vi.fn(async () => undefined),
        remove: vi.fn(async () => undefined),
        setActive: vi.fn()
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

function renderPalette(adapter: TestAdapter): ReturnType<typeof render> {
  installBridge()
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[adapter]}>
        <AiSafetyProvider>
          <WorkspaceHarness>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <>
                      <CommandPalette />
                      <p>Home placeholder</p>
                    </>
                  }
                />
                <Route path="/ai" element={<p>AI placeholder</p>} />
                <Route path="/agents/:agentId" element={<p>Agent detail placeholder</p>} />
                <Route
                  path="/automations/forge/:workflowId"
                  element={<p>Workflow placeholder</p>}
                />
                <Route path="/files" element={<p>Files placeholder</p>} />
              </Routes>
            </MemoryRouter>
          </WorkspaceHarness>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('CommandPalette', () => {
  afterEach(() => {
    clearBridge()
  })

  it('is closed until the "commands" action fires', () => {
    renderPalette(new TestAdapter())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens on the real "commands" controller action (Menu button / M key)', () => {
    const adapter = new TestAdapter()
    renderPalette(adapter)

    inject(adapter, 'commands')

    expect(screen.getByRole('dialog', { name: 'Command Palette' })).toBeInTheDocument()
  })

  it('toggles closed on a second "commands" press', () => {
    const adapter = new TestAdapter()
    renderPalette(adapter)

    inject(adapter, 'commands')
    inject(adapter, 'commands')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('filters the real screen list by query', async () => {
    const adapter = new TestAdapter()
    const user = userEvent.setup()
    renderPalette(adapter)
    inject(adapter, 'commands')

    await user.type(screen.getByPlaceholderText(/Search commands/), 'terminal')

    expect(screen.getByText('Open Terminal')).toBeInTheDocument()
    expect(screen.queryByText('Open Files')).not.toBeInTheDocument()
  })

  it('navigates and closes when a result is run', async () => {
    const adapter = new TestAdapter()
    const user = userEvent.setup()
    renderPalette(adapter)
    inject(adapter, 'commands')

    await user.click(screen.getByText('Open AI'))

    expect(screen.getByText('AI placeholder')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('searches real workspace, file, workflow, agent, and settings domains', async () => {
    const adapter = new TestAdapter()
    const user = userEvent.setup()
    renderPalette(adapter)
    inject(adapter, 'commands')

    expect(await screen.findByText('Open Neurodeck')).toBeInTheDocument()
    expect(screen.getByText('Open README.md')).toBeInTheDocument()
    expect(screen.getByText('Open Release Train')).toBeInTheDocument()
    expect(screen.getByText('Open Reviewer')).toBeInTheDocument()

    await user.clear(screen.getByPlaceholderText(/Search commands/))
    await user.type(screen.getByPlaceholderText(/Search commands/), 'privacy')

    expect(screen.getAllByText('Open Privacy and Permissions').length).toBeGreaterThan(0)
  })

  it('navigates to real entity destinations from non-screen domains', async () => {
    const adapter = new TestAdapter()
    const user = userEvent.setup()
    renderPalette(adapter)
    inject(adapter, 'commands')

    await user.click(await screen.findByText('Open Reviewer'))

    expect(screen.getByText('Agent detail placeholder')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on the real "back" controller action', () => {
    const adapter = new TestAdapter()
    renderPalette(adapter)
    inject(adapter, 'commands')
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    inject(adapter, 'back')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows registered tools in a real Tools section and submits through the real safety pipeline', async () => {
    const TOOL = {
      id: 'demo-tool',
      title: 'Demo Tool',
      description: '',
      requiredCapability: 'system.changeSettings' as const,
      risk: 'low' as const,
      reversible: true,
      run: async () => ({ success: true, message: 'done' })
    }
    function Bootstrap(): null {
      const { registry } = useAiSafety()
      registry.register(TOOL)
      return null
    }
    const adapter = new TestAdapter()
    const user = userEvent.setup()
    installBridge()
    render(
      <ToastProvider>
        <FocusEngineProvider adapters={[adapter]}>
          <AiSafetyProvider>
            <Bootstrap />
            <WorkspaceHarness>
              <MemoryRouter initialEntries={['/']}>
                <CommandPalette />
              </MemoryRouter>
            </WorkspaceHarness>
          </AiSafetyProvider>
        </FocusEngineProvider>
      </ToastProvider>
    )
    inject(adapter, 'commands')

    await user.click(screen.getByText('Run: Demo Tool'))

    // No grant exists yet, so the submission requires approval: the real
    // pipeline surfaces this as a notification rather than silently running.
    expect(await screen.findByText('Demo Tool needs your approval')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Command Palette' })).not.toBeInTheDocument()
  })
})
