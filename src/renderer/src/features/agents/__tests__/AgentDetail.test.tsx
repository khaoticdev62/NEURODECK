import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AgentDefinition, AgentRun, NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
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
    <AiSafetyProvider>
      <WorkspaceContext.Provider value={workspaceValue()}>
        <MemoryRouter initialEntries={[`/agents/${agentId}`]}>
          <Routes>
            <Route path="/agents/:agentId" element={<AgentDetail />} />
          </Routes>
        </MemoryRouter>
      </WorkspaceContext.Provider>
    </AiSafetyProvider>
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
  childAgentPolicy: { allowChildAgents: false, maxChildrenPerRun: 0, maxDepth: 0 },
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
  dryRun: false,
  toolExecutions: [],
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
    expect(screen.getByText(/Child agent policy: disabled/)).toBeInTheDocument()
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

    expect(start).toHaveBeenCalledWith({
      agentId: 'a1',
      objective: 'Inspect the repository',
      dryRun: false
    })
    expect(await screen.findByText('Inspect the repository')).toBeInTheDocument()
  })

  it('starts a real dry run when the Dry run checkbox is checked', async () => {
    const dryRunRun = { ...sampleRun, dryRun: true }
    const start = vi.fn().mockResolvedValue({ ok: true, data: dryRunRun })
    bridgeWithDefaults({ start })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Repository Maintainer')

    await user.type(screen.getByPlaceholderText('Objective for this run'), 'Inspect the repository')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Start dry run' }))

    expect(start).toHaveBeenCalledWith({
      agentId: 'a1',
      objective: 'Inspect the repository',
      dryRun: true
    })
    expect(await screen.findByText(/\[Dry run\]/)).toBeInTheDocument()
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

  it('shows real persisted tool executions in the Tools tab', async () => {
    const runWithTools: AgentRun = {
      ...sampleRun,
      toolExecutions: [
        {
          requestId: 'req-1',
          toolId: 'files-write',
          arguments: { relativePath: 'README.md' },
          status: 'passed',
          message: 'Wrote README.md.',
          requestedAt: Date.now(),
          resolvedAt: Date.now()
        }
      ]
    }
    bridgeWithDefaults({ list: vi.fn().mockResolvedValue({ ok: true, data: [runWithTools] }) })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Repository Maintainer')

    await user.click(screen.getByRole('button', { name: 'Tools' }))

    expect(await screen.findByText('files-write')).toBeInTheDocument()
    expect(screen.getByText('Wrote README.md.')).toBeInTheDocument()
    expect(screen.getByText('passed')).toBeInTheDocument()
  })

  it('filters the Logs tab to this agent and the selected run', async () => {
    bridgeWithDefaults({ list: vi.fn().mockResolvedValue({ ok: true, data: [sampleRun] }) })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Repository Maintainer')

    await user.click(screen.getByRole('button', { name: 'Logs' }))

    expect(
      await screen.findByText(/No audited actions for this agent\/run yet/)
    ).toBeInTheDocument()
  })

  it('derives the Files tab from files-write/files-delete tool executions', async () => {
    const runWithFiles: AgentRun = {
      ...sampleRun,
      toolExecutions: [
        {
          requestId: 'req-1',
          toolId: 'files-delete',
          arguments: { relativePath: 'old-notes.md' },
          status: 'passed',
          requestedAt: Date.now(),
          resolvedAt: Date.now()
        }
      ]
    }
    bridgeWithDefaults({ list: vi.fn().mockResolvedValue({ ok: true, data: [runWithFiles] }) })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Repository Maintainer')

    await user.click(screen.getByRole('button', { name: 'Files' }))

    expect(await screen.findByText('old-notes.md')).toBeInTheDocument()
    expect(screen.getByText(/delete/)).toBeInTheDocument()
  })

  it('shows the permission ceiling and denied tool calls in the Permissions tab', async () => {
    const agentWithCeiling: AgentDefinition = { ...sampleAgent, permissionCeiling: ['files.write'] }
    const runWithDenial: AgentRun = {
      ...sampleRun,
      toolExecutions: [
        {
          requestId: 'req-1',
          toolId: 'files-delete',
          arguments: { relativePath: 'README.md' },
          status: 'denied',
          message: 'Outside permission ceiling.',
          requestedAt: Date.now(),
          resolvedAt: Date.now()
        }
      ]
    }
    stubBridge({
      agents: { list: vi.fn().mockResolvedValue({ ok: true, data: [agentWithCeiling] }) } as never,
      agentRuns: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [runWithDenial] }),
        onUpdate: vi.fn().mockReturnValue(() => undefined)
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Repository Maintainer')

    await user.click(screen.getByRole('button', { name: 'Permissions' }))

    expect(await screen.findByText('files.write')).toBeInTheDocument()
    expect(screen.getByText(/Outside permission ceiling/)).toBeInTheDocument()
  })
})
