import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { DisplayModeProvider } from '../../../state/displayMode'
import { DisplaySettingsProvider } from '../../../state/displaySettings'
import { resetCoreTelemetry } from '../../../state/useCoreTelemetry'
import { KioskModeProvider } from '../../../state/kioskMode'
import { LockProvider } from '../../../state/lockState'
import { ShareSheetProvider } from '../../../state/shareSheet'
import { useDisplayMode } from '../../../state/useDisplayMode'
import { WorkspaceProvider } from '../../../features/workspaces/WorkspaceProvider'
import type { NdxBridge } from '@shared/contracts'
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

function stubBridge(): void {
  window.ndx = {
    workspaces: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      create: vi.fn(),
      remove: vi.fn(),
      pickFolder: vi.fn(),
      discover: vi.fn()
    },
    agentRuns: {
      list: vi.fn(),
      get: vi.fn(),
      start: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      onUpdate: vi.fn(() => () => undefined),
      onToolRequest: vi.fn(() => () => undefined)
    },
    // TopNavBar's real active-model-provider lookup (ShellLayout).
    modelProviders: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    },
    // Footer's real telemetry poll (useCoreTelemetry).
    system: {
      collectMetrics: vi.fn().mockResolvedValue({
        ok: false,
        error: { userMessage: 'System metrics unavailable in test', code: 'unavailable' }
      })
    }
  } as unknown as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup
  delete window.ndx
  resetCoreTelemetry()
})

function renderShell(): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <WorkspaceProvider>
            <DisplayModeProvider>
              <DisplaySettingsProvider>
                <LockProvider>
                  <KioskModeProvider>
                    <ShareSheetProvider>
                      <MemoryRouter initialEntries={['/']}>
                        <Routes>
                          <Route element={<ShellLayout />}>
                            <Route path="/" element={<ModeSwitcher />} />
                            <Route
                              path="/search"
                              element={<div data-testid="search-screen">Search</div>}
                            />
                          </Route>
                        </Routes>
                      </MemoryRouter>
                    </ShareSheetProvider>
                  </KioskModeProvider>
                </LockProvider>
              </DisplaySettingsProvider>
            </DisplayModeProvider>
          </WorkspaceProvider>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('ShellLayout', () => {
  it('renders the hybrid workbench anatomy: title bar, Activity Bar, tool windows, bottom panel, status/action bar', () => {
    const { container } = renderShell()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('Command Center')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Primary Tool Window' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Context' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Bottom Tool Window' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(container.querySelector('[data-ndx-theme="hybrid-dark"]')).not.toBeNull()
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

  it('opens global search when / is pressed outside of an input', async () => {
    stubBridge()
    renderShell()
    fireEvent.keyDown(document, { key: '/', code: 'Slash' })
    await waitFor(() => {
      expect(screen.getByTestId('search-screen')).toBeInTheDocument()
    })
  })

  it('does not open global search when / is typed into an input', async () => {
    stubBridge()
    renderShell()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: '/', code: 'Slash' })
    expect(screen.queryByTestId('search-screen')).not.toBeInTheDocument()
    document.body.removeChild(input)
  })
})
