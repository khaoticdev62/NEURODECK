import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AiSafetyProvider } from '../ai-safety/AiSafetyProvider'
import { FocusEngineProvider } from '../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../controller/testing/testAdapter'
import { ToastProvider } from '../components/overlays/Toast'

/** Shared by feature-screen tests that need a router + a real (but hardware-free) focus engine + the AI safety pipeline. */
export function renderWithProviders(
  element: ReactElement,
  options: { initialEntries?: string[] } = {}
): RenderResult {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>{element}</MemoryRouter>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}
