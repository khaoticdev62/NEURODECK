import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AgentDefinition, NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { AgentOperationsCenter } from '../AgentOperationsCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function workspaceValue(active: boolean): WorkspaceContextValue {
  const workspace = active
    ? { id: 'w1', name: 'project', rootPath: '/workspace/project', createdAt: Date.now() }
    : null
  return {
    workspaces: workspace ? [workspace] : [],
    activeWorkspaceId: workspace?.id ?? null,
    activeWorkspace: workspace,
    loading: false,
    error: null,
    refresh: vi.fn(),
    addFromPicker: vi.fn(),
    remove: vi.fn(),
    setActive: vi.fn()
  }
}

function renderScreen(active = true): ReturnType<typeof render> {
  return render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <AiSafetyProvider>
        <WorkspaceContext.Provider value={workspaceValue(active)}>
          <MemoryRouter>
            <AgentOperationsCenter />
          </MemoryRouter>
        </WorkspaceContext.Provider>
      </AiSafetyProvider>
    </FocusEngineProvider>
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

describe('AgentOperationsCenter', () => {
  it('requires an active workspace', () => {
    renderScreen(false)
    expect(screen.getByText('No active workspace')).toBeInTheDocument()
  })

  it('shows the real empty state when there are no agents', async () => {
    stubBridge({ agents: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never })
    renderScreen()
    expect(await screen.findByText('No agents yet')).toBeInTheDocument()
  })

  it('lists a real agent', async () => {
    stubBridge({
      agents: { list: vi.fn().mockResolvedValue({ ok: true, data: [sampleAgent] }) } as never
    })
    renderScreen()

    expect(await screen.findByText('Repository Maintainer')).toBeInTheDocument()
    expect(screen.getByText(/Code reviewer/)).toBeInTheDocument()
  })

  it('creates a real agent via IPC', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, data: sampleAgent })
    stubBridge({
      agents: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }), create } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('No agents yet')

    await user.click(screen.getByRole('button', { name: 'New agent' }))
    await user.type(screen.getByPlaceholderText('Agent name'), 'Repository Maintainer')
    await user.type(screen.getByPlaceholderText('Role (e.g. Code reviewer)'), 'Code reviewer')
    await user.type(
      screen.getByPlaceholderText('Goal (e.g. Find actionable risks)'),
      'Find actionable risks'
    )
    await user.click(screen.getByRole('button', { name: 'Create agent' }))

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Repository Maintainer',
        role: 'Code reviewer',
        workspaceId: 'w1'
      })
    )
    expect(await screen.findByText('Repository Maintainer')).toBeInTheDocument()
  })

  it('toggles enabled state via IPC', async () => {
    const setEnabled = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { ...sampleAgent, enabled: false } })
    stubBridge({
      agents: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleAgent] }),
        setEnabled
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Repository Maintainer')

    await user.click(screen.getByRole('button', { name: 'Disable' }))

    expect(setEnabled).toHaveBeenCalledWith({ agentId: 'a1', enabled: false })
    expect(await screen.findByRole('button', { name: 'Enable' })).toBeInTheDocument()
  })

  it('removes an agent via IPC', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      agents: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleAgent] }),
        remove
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Repository Maintainer')

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(remove).toHaveBeenCalledWith({ agentId: 'a1' })
    expect(await screen.findByText('No agents yet')).toBeInTheDocument()
  })
})
