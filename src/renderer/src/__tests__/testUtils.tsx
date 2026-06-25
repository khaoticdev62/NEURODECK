import { render, type RenderResult } from '@testing-library/react'
import { StrictMode, type ReactElement } from 'react'
import { MemoryRouter, type InitialEntry } from 'react-router-dom'
import { AiSafetyProvider } from '../ai-safety/AiSafetyProvider'
import { FocusEngineProvider } from '../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../controller/testing/testAdapter'
import { ToastProvider } from '../components/overlays/Toast'
import { WorkspaceProvider } from '../features/workspaces/WorkspaceProvider'
import { WorkflowRunnerProvider } from '../workflows/WorkflowRunnerProvider'

/**
 * Shared by feature-screen tests that need a router + a real (but
 * hardware-free) focus engine + the AI safety pipeline + workspace state +
 * workflow runner. `strict: true` wraps the tree in `<StrictMode>`, the
 * same as `main.tsx` does in the real app — React deliberately
 * mount→cleanup→mounts every component once under it in development,
 * which is how a real bug (a boot-stalling stale `abortRef` that never
 * reset between those two mounts) was caught; use it for any effect whose
 * cleanup sets a ref/flag a later run depends on.
 */
export function renderWithProviders(
  element: ReactElement,
  options: { initialEntries?: InitialEntry[]; strict?: boolean } = {}
): RenderResult {
  const tree = (
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
  return render(options.strict ? <StrictMode>{tree}</StrictMode> : tree)
}
