import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
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
    <FocusEngineProvider adapters={[adapter]}>
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
    </FocusEngineProvider>
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
})
