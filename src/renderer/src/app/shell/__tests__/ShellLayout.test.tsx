import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { DisplayModeProvider } from '../../../state/displayMode'
import { DisplaySettingsProvider } from '../../../state/displaySettings'
import { useDisplayMode } from '../../../state/useDisplayMode'
import { WorkspaceProvider } from '../../../features/workspaces/WorkspaceProvider'
import { ShellLayout } from '../ShellLayout'

function ModeSwitcher(): React.JSX.Element {
  const { baseMode, setBaseMode } = useDisplayMode()
  return (
    <div>
      <span data-testid="current-mode">{baseMode}</span>
      <button type="button" onClick={() => setBaseMode('focus')}>
        Enter focus mode
      </button>
      <button type="button" onClick={() => setBaseMode('theater')}>
        Enter theater mode
      </button>
    </div>
  )
}

function renderShell(): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <WorkspaceProvider>
            <DisplayModeProvider>
              <DisplaySettingsProvider>
                <MemoryRouter initialEntries={['/']}>
                  <Routes>
                    <Route element={<ShellLayout />}>
                      <Route path="/" element={<ModeSwitcher />} />
                    </Route>
                  </Routes>
                </MemoryRouter>
              </DisplaySettingsProvider>
            </DisplayModeProvider>
          </WorkspaceProvider>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('ShellLayout', () => {
  it('renders the standard shell anatomy: system rail, nav rail, content, context panel, controller rail', () => {
    renderShell()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Context' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('collapses the navigation rail and context panel in focus mode (wireframe §3.3)', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: 'Enter focus mode' }))

    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Context' })).not.toBeInTheDocument()
    // Top and bottom rails persist even in focus mode.
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('marks theater mode via data-display-mode for density scaling (tokens.css)', async () => {
    const user = userEvent.setup()
    const { container } = renderShell()

    await user.click(screen.getByRole('button', { name: 'Enter theater mode' }))

    expect(container.querySelector('[data-display-mode="theater"]')).not.toBeNull()
    // Theater mode keeps the rails visible — only density changes.
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })
})
