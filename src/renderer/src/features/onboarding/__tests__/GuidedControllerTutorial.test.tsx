import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { createTutorialAcknowledgeTool } from '../../../ai-safety/tools/tutorialAcknowledgeTool'
import { useAiSafety } from '../../../ai-safety/useAiSafety'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkflowRunnerProvider } from '../../../workflows/WorkflowRunnerProvider'
import { WorkspaceProvider } from '../../workspaces/WorkspaceProvider'
import { GuidedControllerTutorial } from '../GuidedControllerTutorial'

function stubBridge(): void {
  window.ndx = {
    workspaces: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      create: vi.fn().mockResolvedValue({ ok: true, data: { id: 'w1' } }),
      remove: vi.fn().mockResolvedValue({ ok: true, data: null }),
      pickFolder: vi.fn().mockResolvedValue({ ok: true, data: null }),
      discover: vi.fn().mockResolvedValue({ ok: true, data: [] })
    }
  } as unknown as NdxBridge
}

beforeEach(() => {
  import.meta.env.VITE_TUTORIAL_ADVANCE_MS = '50'
  import.meta.env.VITE_TUTORIAL_PROGRESS_INTERVAL_MS = '10'
  import.meta.env.VITE_TUTORIAL_PROGRESS_STEP = '20'
})

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
  delete import.meta.env.VITE_TUTORIAL_ADVANCE_MS
  delete import.meta.env.VITE_TUTORIAL_PROGRESS_INTERVAL_MS
  delete import.meta.env.VITE_TUTORIAL_PROGRESS_STEP
})

function ToolBootstrap(): null {
  const { registry } = useAiSafety()
  registry.register(createTutorialAcknowledgeTool())
  return null
}

function renderTutorial(): { adapter: TestAdapter; unmount: () => void } {
  const adapter = new TestAdapter()
  const result = render(
    <ToastProvider>
      <FocusEngineProvider adapters={[adapter]}>
        <AiSafetyProvider>
          <ToolBootstrap />
          <WorkspaceProvider>
            <WorkflowRunnerProvider>
              <MemoryRouter initialEntries={['/onboarding/tutorial']}>
                <Routes>
                  <Route path="/onboarding/tutorial" element={<GuidedControllerTutorial />} />
                  <Route path="/" element={<p>Home</p>} />
                </Routes>
              </MemoryRouter>
            </WorkflowRunnerProvider>
          </WorkspaceProvider>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
  return { adapter, unmount: result.unmount }
}

const WAIT = { timeout: 500 }

async function advanceToLesson(adapter: TestAdapter, target: number): Promise<void> {
  const targetTitle: Record<number, string> = {
    2: '2. Open and go back',
    3: '3. Object actions',
    4: '4. Ask AI',
    5: '5. Open Command Palette',
    6: '6. Approve a harmless plan',
    7: '7. Pause and resume'
  }

  const sequence: Array<{ action: Parameters<TestAdapter['inject']>[0]; expectedTitle: string }> = [
    { action: 'nav.down', expectedTitle: '2. Open and go back' },
    { action: 'confirm', expectedTitle: 'Detail view' },
    { action: 'back', expectedTitle: '3. Object actions' },
    { action: 'context', expectedTitle: '4. Ask AI' },
    { action: 'assist', expectedTitle: '5. Open Command Palette' },
    { action: 'commands', expectedTitle: '6. Approve a harmless plan' },
    { action: 'confirm', expectedTitle: '7. Pause and resume' }
  ]

  for (const step of sequence) {
    adapter.inject(step.action)
    await waitFor(() => expect(screen.getByText(step.expectedTitle)).toBeInTheDocument(), WAIT)
    if (step.expectedTitle === targetTitle[target]) break
  }
}

describe('GuidedControllerTutorial', () => {
  it('starts at lesson 1 and advances on a nav action', async () => {
    stubBridge()
    const { adapter } = renderTutorial()

    expect(screen.getByText('1. Move focus')).toBeInTheDocument()

    adapter.inject('nav.down')

    await waitFor(() => {
      expect(screen.getByText('2. Open and go back')).toBeInTheDocument()
    }, WAIT)
  })

  it('lesson 2 opens a detail and completes on back', async () => {
    stubBridge()
    const { adapter } = renderTutorial()

    adapter.inject('nav.down')
    await waitFor(() => expect(screen.getByText('2. Open and go back')).toBeInTheDocument(), WAIT)

    adapter.inject('confirm')
    await waitFor(() => expect(screen.getByText('Detail view')).toBeInTheDocument(), WAIT)

    adapter.inject('back')
    await waitFor(() => expect(screen.getByText('3. Object actions')).toBeInTheDocument(), WAIT)
  })

  it('lesson 3 and 4 advance on context and assist', async () => {
    stubBridge()
    const { adapter } = renderTutorial()

    await advanceToLesson(adapter, 3)

    adapter.inject('context')
    await waitFor(() => expect(screen.getByText('4. Ask AI')).toBeInTheDocument(), WAIT)

    adapter.inject('assist')
    await waitFor(
      () => expect(screen.getByText('5. Open Command Palette')).toBeInTheDocument(),
      WAIT
    )
  })

  it('lesson 5 advances on commands action', async () => {
    stubBridge()
    const { adapter } = renderTutorial()

    await advanceToLesson(adapter, 5)

    adapter.inject('commands')
    await waitFor(() => {
      expect(screen.getByText('6. Approve a harmless plan')).toBeInTheDocument()
    }, WAIT)
  })

  it('lesson 6 approves the tutorial tool and advances', async () => {
    stubBridge()
    const { adapter } = renderTutorial()

    await advanceToLesson(adapter, 6)

    adapter.inject('confirm')
    await waitFor(() => {
      expect(screen.getByText('7. Pause and resume')).toBeInTheDocument()
    }, WAIT)
  })

  it('lesson 7 completes when the simulated task reaches 100%', async () => {
    stubBridge()
    const { adapter } = renderTutorial()

    await advanceToLesson(adapter, 7)

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument()
      },
      { timeout: 1000 }
    )
  })
})
