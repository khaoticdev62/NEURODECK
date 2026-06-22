import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { PowerMenu } from '../PowerMenu'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderMenu(): ReturnType<typeof render> {
  return render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <PowerMenu />
    </FocusEngineProvider>
  )
}

describe('PowerMenu', () => {
  it('shows real safe actions and honestly labeled deferred options', () => {
    renderMenu()

    expect(screen.getByText('Restart NeuroDeck')).toBeInTheDocument()
    expect(screen.getByText('Quit NeuroDeck / Return to SteamOS')).toBeInTheDocument()
    expect(screen.getByText(/Not available: Needs the Lock Screen/)).toBeInTheDocument()
    expect(screen.getByText(/Not available: A real OS reboot is irreversible/)).toBeInTheDocument()
  })

  it('restarts the app via real IPC after confirmation', async () => {
    const restartApp = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({ power: { restartApp, quitApp: vi.fn() } as never })

    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getAllByRole('button', { name: 'Select' })[0])
    expect(screen.getByText('Restart NeuroDeck', { selector: 'dd' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restart' }))

    expect(restartApp).toHaveBeenCalledTimes(1)
  })

  it('quits the app via real IPC after confirmation', async () => {
    const quitApp = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({ power: { restartApp: vi.fn(), quitApp } as never })

    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getAllByRole('button', { name: 'Select' })[1])
    await user.click(screen.getByRole('button', { name: 'Quit' }))

    expect(quitApp).toHaveBeenCalledTimes(1)
  })

  it('cancels without calling any power IPC', async () => {
    const restartApp = vi.fn()
    stubBridge({ power: { restartApp, quitApp: vi.fn() } as never })

    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getAllByRole('button', { name: 'Select' })[0])
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(restartApp).not.toHaveBeenCalled()
  })
})
