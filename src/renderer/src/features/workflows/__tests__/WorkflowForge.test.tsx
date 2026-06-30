import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { WorkflowForge } from '../WorkflowForge'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function workspaceValue(): WorkspaceContextValue {
  return {
    workspaces: [
      { id: 'w1', name: 'project', rootPath: '/workspace/project', createdAt: Date.now() }
    ],
    activeWorkspaceId: 'w1',
    activeWorkspace: {
      id: 'w1',
      name: 'project',
      rootPath: '/workspace/project',
      createdAt: Date.now()
    },
    loading: false,
    error: null,
    refresh: vi.fn(),
    addFromPicker: vi.fn(),
    remove: vi.fn(),
    setActive: vi.fn()
  }
}

function renderForge(initialEntry = '/automations/forge'): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <WorkspaceContext.Provider value={workspaceValue()}>
            <MemoryRouter initialEntries={[initialEntry]}>
              <Routes>
                <Route path="/automations/forge" element={<WorkflowForge />} />
                <Route path="/automations/forge/:workflowId" element={<WorkflowForge />} />
                <Route path="/automations" element={<p>Library</p>} />
              </Routes>
            </MemoryRouter>
          </WorkspaceContext.Provider>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('WorkflowForge', () => {
  it('adds a real step and saves a real, runnable workflow', async () => {
    const save = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        id: 'wf1',
        workspaceId: 'w1',
        name: 'My workflow',
        description: '',
        steps: [],
        version: 1,
        createdAt: 0,
        updatedAt: 0
      }
    })
    stubBridge({ workflows: { save } as never })

    const user = userEvent.setup()
    renderForge()

    await user.type(screen.getByPlaceholderText('Workflow name'), 'My workflow')
    await user.click(screen.getByRole('button', { name: 'Add step' }))
    expect(screen.getByText(/1\. Tool action/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save workflow' }))

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'w1',
        name: 'My workflow',
        steps: expect.arrayContaining([expect.objectContaining({ kind: 'tool-action' })])
      })
    )
    expect(await screen.findByText('Library')).toBeInTheDocument()
  })

  it('loads a real existing workflow for editing', async () => {
    const existing = {
      id: 'wf1',
      workspaceId: 'w1',
      name: 'Existing workflow',
      description: 'desc',
      steps: [{ id: 's1', kind: 'delay' as const, title: 'Wait', milliseconds: 500 }],
      version: 2,
      createdAt: 0,
      updatedAt: 0
    }
    stubBridge({
      workflows: { list: vi.fn().mockResolvedValue({ ok: true, data: [existing] }) } as never
    })

    renderForge('/automations/forge/wf1')

    expect(await screen.findByDisplayValue('Existing workflow')).toBeInTheDocument()
    expect(screen.getByText(/1\. Delay/)).toBeInTheDocument()
  })

  it('removes a step', async () => {
    stubBridge({ workflows: { save: vi.fn() } as never })

    const user = userEvent.setup()
    renderForge()
    await user.click(screen.getByRole('button', { name: 'Add step' }))
    expect(screen.getByText(/1\. Tool action/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(screen.getByText('No steps yet')).toBeInTheDocument()
  })

  it('adds a real ai-decision step with an editable prompt', async () => {
    const save = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        id: 'wf2',
        workspaceId: 'w1',
        name: 'Decision workflow',
        description: '',
        steps: [],
        version: 1,
        createdAt: 0,
        updatedAt: 0
      }
    })
    stubBridge({ workflows: { save } as never })
    const user = userEvent.setup()
    renderForge()

    await user.type(screen.getByPlaceholderText('Workflow name'), 'Decision workflow')
    await user.selectOptions(
      screen.getByDisplayValue('Tool action'),
      'AI decision (fails the run if the model says stop)'
    )
    await user.click(screen.getByRole('button', { name: 'Add step' }))
    expect(screen.getByText(/1\. AI decision/)).toBeInTheDocument()

    const promptField = screen.getByPlaceholderText(
      'What should the model decide? (it sees current context variables and must answer proceed/stop)'
    )
    await user.type(promptField, 'Is this safe to continue?')

    await user.click(screen.getByRole('button', { name: 'Save workflow' }))

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        steps: expect.arrayContaining([
          expect.objectContaining({ kind: 'ai-decision', prompt: 'Is this safe to continue?' })
        ])
      })
    )
  })
})
