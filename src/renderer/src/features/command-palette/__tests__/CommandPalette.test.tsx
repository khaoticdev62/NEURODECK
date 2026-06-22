import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { useAiSafety } from '../../../ai-safety/useAiSafety'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import type {
  ControllerAction,
  ControllerActionPhase
} from '../../../controller/adapters/controllerAction'
import { CommandPalette } from '../CommandPalette'

/** adapter.inject() drives a real React state update outside of an event handler — act() makes the test wait for the resulting re-render. */
function inject(
  adapter: TestAdapter,
  action: ControllerAction,
  phase: ControllerActionPhase = 'press'
): void {
  act(() => adapter.inject(action, phase))
}

function renderPalette(adapter: TestAdapter): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[adapter]}>
        <AiSafetyProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <CommandPalette />
                    <p>Home placeholder</p>
                  </>
                }
              />
              <Route path="/ai" element={<p>AI placeholder</p>} />
            </Routes>
          </MemoryRouter>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('CommandPalette', () => {
  it('is closed until the "commands" action fires', () => {
    renderPalette(new TestAdapter())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens on the real "commands" controller action (Menu button / M key)', () => {
    const adapter = new TestAdapter()
    renderPalette(adapter)

    inject(adapter, 'commands')

    expect(screen.getByRole('dialog', { name: 'Command Palette' })).toBeInTheDocument()
  })

  it('toggles closed on a second "commands" press', () => {
    const adapter = new TestAdapter()
    renderPalette(adapter)

    inject(adapter, 'commands')
    inject(adapter, 'commands')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('filters the real screen list by query', async () => {
    const adapter = new TestAdapter()
    const user = userEvent.setup()
    renderPalette(adapter)
    inject(adapter, 'commands')

    await user.type(screen.getByPlaceholderText(/Search commands/), 'terminal')

    expect(screen.getByText('Open Terminal')).toBeInTheDocument()
    expect(screen.queryByText('Open Files')).not.toBeInTheDocument()
  })

  it('navigates and closes when a result is run', async () => {
    const adapter = new TestAdapter()
    const user = userEvent.setup()
    renderPalette(adapter)
    inject(adapter, 'commands')

    await user.click(screen.getByText('Open AI'))

    expect(screen.getByText('AI placeholder')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on the real "back" controller action', () => {
    const adapter = new TestAdapter()
    renderPalette(adapter)
    inject(adapter, 'commands')
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    inject(adapter, 'back')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows registered tools in a real Tools section and submits through the real safety pipeline', async () => {
    const TOOL = {
      id: 'demo-tool',
      title: 'Demo Tool',
      description: '',
      requiredCapability: 'system.changeSettings' as const,
      risk: 'low' as const,
      reversible: true,
      run: async () => ({ success: true, message: 'done' })
    }
    function Bootstrap(): null {
      const { registry } = useAiSafety()
      registry.register(TOOL)
      return null
    }
    const adapter = new TestAdapter()
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <FocusEngineProvider adapters={[adapter]}>
          <AiSafetyProvider>
            <Bootstrap />
            <MemoryRouter initialEntries={['/']}>
              <CommandPalette />
            </MemoryRouter>
          </AiSafetyProvider>
        </FocusEngineProvider>
      </ToastProvider>
    )
    inject(adapter, 'commands')

    await user.click(screen.getByText('Run: Demo Tool'))

    // No grant exists yet, so the submission requires approval — the real
    // pipeline surfaces this as a notification rather than silently running.
    expect(await screen.findByText('Demo Tool needs your approval')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Command Palette' })).not.toBeInTheDocument()
  })
})
