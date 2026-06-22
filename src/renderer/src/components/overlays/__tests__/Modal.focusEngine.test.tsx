import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { Modal } from '../Modal'

describe('Modal + FocusEngine integration', () => {
  it('closes when a "back" controller action fires (e.g. gamepad B button)', () => {
    const onClose = vi.fn()
    const adapter = new TestAdapter()

    render(
      <FocusEngineProvider adapters={[adapter]}>
        <Modal open onClose={onClose} title="Controller-closable">
          content
        </Modal>
      </FocusEngineProvider>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    adapter.inject('back', 'press')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose for unrelated actions', () => {
    const onClose = vi.fn()
    const adapter = new TestAdapter()

    render(
      <FocusEngineProvider adapters={[adapter]}>
        <Modal open onClose={onClose} title="Controller-closable">
          content
        </Modal>
      </FocusEngineProvider>
    )

    adapter.inject('confirm', 'press')

    expect(onClose).not.toHaveBeenCalled()
  })
})
