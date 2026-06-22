import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, WorkflowRun } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import {
  WorkflowRunnerContext,
  type WorkflowRunnerContextValue
} from '../../../workflows/WorkflowRunnerContext'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { WorkflowRunDetail } from '../WorkflowRunDetail'

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

function runnerValue(
  overrides: Partial<WorkflowRunnerContextValue> = {}
): WorkflowRunnerContextValue {
  return {
    liveRuns: {},
    startRun: vi.fn(),
    resolveApproval: vi.fn(),
    cancelRun: vi.fn(),
    ...overrides
  }
}

function renderDetail(
  runnerOverrides: Partial<WorkflowRunnerContextValue> = {}
): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <WorkspaceContext.Provider value={workspaceValue()}>
            <WorkflowRunnerContext.Provider value={runnerValue(runnerOverrides)}>
              <MemoryRouter initialEntries={['/automations/runs/run-1']}>
                <Routes>
                  <Route path="/automations/runs/:runId" element={<WorkflowRunDetail />} />
                </Routes>
              </MemoryRouter>
            </WorkflowRunnerContext.Provider>
          </WorkspaceContext.Provider>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

const baseRun: WorkflowRun = {
  id: 'run-1',
  workflowId: 'wf1',
  workspaceId: 'w1',
  status: 'running',
  steps: [{ stepId: 's1', status: 'passed', message: 'done' }],
  context: {},
  startedAt: Date.now()
}

describe('WorkflowRunDetail', () => {
  it('shows real live run state from the workflow runner context', async () => {
    stubBridge({
      workflowRuns: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })

    renderDetail({ liveRuns: { 'run-1': baseRun } })

    expect(await screen.findByText('s1 · Passed')).toBeInTheDocument()
    expect(screen.getByText('done')).toBeInTheDocument()
  })

  it('falls back to a persisted run when there is no live state', async () => {
    const persisted: WorkflowRun = { ...baseRun, status: 'passed' }
    stubBridge({
      workflowRuns: { list: vi.fn().mockResolvedValue({ ok: true, data: [persisted] }) } as never
    })

    renderDetail()

    expect(await screen.findByText('Status: passed')).toBeInTheDocument()
  })

  it('shows real approve/reject controls for a waiting-for-approval step, wired to the runner', async () => {
    const resolveApproval = vi.fn()
    const waitingRun: WorkflowRun = {
      ...baseRun,
      steps: [{ stepId: 's1', status: 'waiting-for-approval' }]
    }
    stubBridge({
      workflowRuns: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })

    const user = userEvent.setup()
    renderDetail({ liveRuns: { 'run-1': waitingRun }, resolveApproval })

    await user.click(await screen.findByRole('button', { name: 'Approve' }))

    expect(resolveApproval).toHaveBeenCalledWith('run-1', true)
  })

  it('cancels a running run via the runner', async () => {
    const cancelRun = vi.fn()
    stubBridge({
      workflowRuns: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })

    const user = userEvent.setup()
    renderDetail({ liveRuns: { 'run-1': baseRun }, cancelRun })

    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(cancelRun).toHaveBeenCalledWith('run-1')
  })
})
