import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AgentDefinition, AgentRun, NdxBridge } from '@shared/contracts'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { AgentDetail } from '../AgentDetail'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function workspaceValue(): WorkspaceContextValue {
  const workspace = {
    id: 'w1',
    name: 'project',
    rootPath: '/workspace/project',
    createdAt: Date.now()
  }
  return {
    workspaces: [workspace],
    activeWorkspaceId: workspace.id,
    activeWorkspace: workspace,
    loading: false,
    error: null,
    refresh: vi.fn(),
    addFromPicker: vi.fn(),
    remove: vi.fn(),
    setActive: vi.fn()
  }
}

function renderScreen(agentId = 'a1'): ReturnType<typeof render> {
  return render(
    <WorkspaceContext.Provider value={workspaceValue()}>
      <MemoryRouter initialEntries={[`/agents/${agentId}`]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetail />} />
        </Routes>
      </MemoryRouter>
    </WorkspaceContext.Provider>
  )
}

const sampleAgent: AgentDefinition = {
  id: 'a1',
  name: 'Repository Maintainer',
  role: 'Code reviewer',
  goal: 'Find actionable risks',
  workspaceId: 'w1',
  modelProfile: 'private-workspace',
  toolAllowlist: [],
  permissionCeiling: [],
  resourceLimits: { maxTokens: 512, timeoutMs: 5000, maxToolCalls: 0 },
  enabled: true,
  createdAt: Date.now(),
  updatedAt: Date.now()
}

const sampleRun: AgentRun = {
  id: 'r1',
  agentId: 'a1',
  workspaceId: 'w1',
  objective: 'Inspect the repository',
  state: 'completed',
  timeline: [
    { id: 't1', at: Date.now(), state: 'completed', message: 'Model planning completed.' }
  ],
  output: '1. Inspect files\n2. Report findings',
  promptTokens: 12,
  completionTokens: 8,
  createdAt: Date.now(),
  updatedAt: Date.now()
}

function bridgeWithDefaults(overrides: Partial<NdxBridge['agentRuns']> = {}): void {
  stubBridge({
    agents: { list: vi.fn().mockResolvedValue({ ok: true, data: [sampleAgent] }) } as never,
    agentRuns: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      onUpdate: vi.fn().mockReturnValue(() => undefined),
      ...overrides
    } as never
  })
}

describe('AgentDetail', () => {
  it('shows a real error state when the agent no longer exists', async () => {
    stubBridge({
      agents: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never,
      agentRuns: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        onUpdate: vi.fn().mockReturnValue(() => undefined)
      } as never
    })
    renderScreen()
    expect(await screen.findByText('Agent not found')).toBeInTheDocument()
  })

  it('shows the real agent overview and past runs', async () => {
    bridgeWithDefaults({ list: vi.fn().mockResolvedValue({ ok: true, data: [sampleRun] }) })
    renderScreen()

    expect(await screen.findByText('Repository Maintainer')).toBeInTheDocument()
    expect(screen.getByText(/Find actionable risks/)).toBeInTheDocument()
    expect(screen.getByText('Inspect the repository')).toBeInTheDocument()
    expect(screen.getByText(/Inspect files/)).toBeInTheDocument()
  })

  it('starts a real run via IPC', async () => {
    const start = vi.fn().mockResolvedValue({ ok: true, data: sampleRun })
    bridgeWithDefaults({ start })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Repository Maintainer')

    await user.type(screen.getByPlaceholderText('Objective for this run'), 'Inspect the repository')
    await user.click(screen.getByRole('button', { name: 'Start run' }))

    expect(start).toHaveBeenCalledWith({ agentId: 'a1', objective: 'Inspect the repository' })
    expect(await screen.findByText('Inspect the repository')).toBeInTheDocument()
  })

  it('cancels a real run via IPC', async () => {
    const cancel = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { ...sampleRun, state: 'cancelled' } })
    const get = vi.fn().mockResolvedValue({ ok: true, data: { ...sampleRun, state: 'cancelled' } })
    bridgeWithDefaults({
      list: vi.fn().mockResolvedValue({ ok: true, data: [{ ...sampleRun, state: 'running' }] }),
      cancel,
      get
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Inspect the repository')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(cancel).toHaveBeenCalledWith({ runId: 'r1' })
    expect(await screen.findByText('cancelled')).toBeInTheDocument()
  })

  it('pauses and resumes a real run via IPC', async () => {
    const pause = vi.fn().mockResolvedValue({ ok: true, data: { ...sampleRun, state: 'paused' } })
    const resume = vi.fn().mockResolvedValue({ ok: true, data: { ...sampleRun, state: 'queued' } })
    bridgeWithDefaults({
      list: vi.fn().mockResolvedValue({ ok: true, data: [{ ...sampleRun, state: 'running' }] }),
      pause,
      resume
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Inspect the repository')

    await user.click(screen.getByRole('button', { name: 'Pause' }))

    expect(pause).toHaveBeenCalledWith({ runId: 'r1' })
    expect(await screen.findByText('paused')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Resume' }))

    expect(resume).toHaveBeenCalledWith({ runId: 'r1' })
    expect(await screen.findByText('queued')).toBeInTheDocument()
  })
})
