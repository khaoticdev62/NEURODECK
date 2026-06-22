import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AiSafetyProvider } from '../ai-safety/AiSafetyProvider'
import { FocusEngineProvider } from '../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../controller/testing/testAdapter'
import { ToastProvider } from '../components/overlays/Toast'
import { WorkspaceProvider } from '../features/workspaces/WorkspaceProvider'

/** Shared by feature-screen tests that need a router + a real (but hardware-free) focus engine + the AI safety pipeline + workspace state. */
export function renderWithProviders(
  element: ReactElement,
  options: { initialEntries?: string[] } = {}
): RenderResult {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <WorkspaceProvider>
            <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>{element}</MemoryRouter>
          </WorkspaceProvider>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}
