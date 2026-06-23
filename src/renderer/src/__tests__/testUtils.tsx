import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, type InitialEntry } from 'react-router-dom'
import { AiSafetyProvider } from '../ai-safety/AiSafetyProvider'
import { FocusEngineProvider } from '../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../controller/testing/testAdapter'
import { ToastProvider } from '../components/overlays/Toast'
import { WorkspaceProvider } from '../features/workspaces/WorkspaceProvider'
import { WorkflowRunnerProvider } from '../workflows/WorkflowRunnerProvider'

/** Shared by feature-screen tests that need a router + a real (but hardware-free) focus engine + the AI safety pipeline + workspace state + workflow runner. */
export function renderWithProviders(
  element: ReactElement,
  options: { initialEntries?: InitialEntry[] } = {}
): RenderResult {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <WorkspaceProvider>
            <WorkflowRunnerProvider>
              <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>
                {element}
              </MemoryRouter>
            </WorkflowRunnerProvider>
          </WorkspaceProvider>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}
