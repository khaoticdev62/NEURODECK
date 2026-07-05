import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, WorkflowDefinition } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkflowRunnerProvider } from '../../../workflows/WorkflowRunnerProvider'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { WorkflowLibrary } from '../WorkflowLibrary'
import { TestWorkbenchStoreRenderer } from '../../../__tests__/testUtils'

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

function renderLibrary(active = true): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <WorkspaceContext.Provider value={workspaceValue(active)}>
            <WorkflowRunnerProvider>
              <MemoryRouter>
                <WorkflowLibrary />
                <TestWorkbenchStoreRenderer />
              </MemoryRouter>
            </WorkflowRunnerProvider>
          </WorkspaceContext.Provider>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

const sampleWorkflow: WorkflowDefinition = {
  id: 'wf1',
  workspaceId: 'w1',
  name: 'Quality Gate',
  description: 'Runs checks',
  steps: [{ id: 's1', kind: 'output', title: 'Done', variable: 'result' }],
  version: 1,
  createdAt: Date.now(),
  updatedAt: Date.now()
}

describe('WorkflowLibrary', () => {
  it('requires an active workspace', () => {
    renderLibrary(false)
    expect(screen.getByText('No workspace yet')).toBeInTheDocument()
  })

  it('shows the real empty state when there are no workflows', async () => {
    stubBridge({ workflows: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never })
    renderLibrary()
    expect(await screen.findByText('No workflows yet')).toBeInTheDocument()
  })

  it('lists a real workflow with its real step count', async () => {
    stubBridge({
      workflows: { list: vi.fn().mockResolvedValue({ ok: true, data: [sampleWorkflow] }) } as never
    })
    renderLibrary()

    expect(await screen.findByText('Quality Gate')).toBeInTheDocument()
    expect(screen.getByText('1 step · v1')).toBeInTheDocument()
  })

  it('removes a workflow via the real IPC call', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      workflows: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleWorkflow] }),
        remove
      } as never
    })

    const user = userEvent.setup()
    renderLibrary()
    await screen.findByText('Quality Gate')

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(remove).toHaveBeenCalledWith({ workspaceId: 'w1', workflowId: 'wf1' })
    expect(await screen.findByText('No workflows yet')).toBeInTheDocument()
  })
})
