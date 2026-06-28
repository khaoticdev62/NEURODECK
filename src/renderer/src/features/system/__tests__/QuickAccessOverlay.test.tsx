import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { QuickAccessOverlay } from '../QuickAccessOverlay'

function stubBridge(): void {
  window.ndx = {
    workspaces: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    }
  } as unknown as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderOverlay(adapter: TestAdapter): ReturnType<typeof render> {
  return render(
    <FocusEngineProvider adapters={[adapter]}>
      <AiSafetyProvider>
        <MemoryRouter>
          <QuickAccessOverlay />
        </MemoryRouter>
      </AiSafetyProvider>
    </FocusEngineProvider>
  )
}

describe('QuickAccessOverlay', () => {
  it('opens on the real "quick.access" controller action', () => {
    stubBridge()
    const adapter = new TestAdapter()
    renderOverlay(adapter)

    act(() => adapter.inject('quick.access', 'press'))

    expect(screen.getByRole('dialog', { name: 'Quick Access' })).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('Workspace')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^LAN Share Open service/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Send with LAN Share/i })).toBeInTheDocument()
  })

  it('closes on the "back" controller action', () => {
    stubBridge()
    const adapter = new TestAdapter()
    renderOverlay(adapter)

    act(() => adapter.inject('quick.access', 'press'))
    expect(screen.getByRole('dialog', { name: 'Quick Access' })).toBeInTheDocument()

    act(() => adapter.inject('back', 'press'))

    expect(screen.queryByRole('dialog', { name: 'Quick Access' })).not.toBeInTheDocument()
  })

  it('closes when clicking the close button', async () => {
    stubBridge()
    const adapter = new TestAdapter()
    const user = userEvent.setup()
    renderOverlay(adapter)

    act(() => adapter.inject('quick.access', 'press'))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog', { name: 'Quick Access' })).not.toBeInTheDocument()
  })

  it('shows honest footer counts when there are no active tasks or approvals', () => {
    stubBridge()
    const adapter = new TestAdapter()
    renderOverlay(adapter)

    act(() => adapter.inject('quick.access', 'press'))

    expect(screen.getByText('No active tasks or approvals')).toBeInTheDocument()
  })

  it('labels placeholder actions as not implemented yet', () => {
    stubBridge()
    const adapter = new TestAdapter()
    renderOverlay(adapter)

    act(() => adapter.inject('quick.access', 'press'))

    expect(screen.getByText('Continue last task')).toBeInTheDocument()
    expect(screen.getAllByText('Not implemented yet').length).toBeGreaterThanOrEqual(1)
  })
})
