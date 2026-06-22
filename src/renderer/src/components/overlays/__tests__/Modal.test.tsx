import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ControllerButton } from '../../primitives/ControllerButton'
import { Modal } from '../Modal'

function Harness(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <ControllerButton onClick={() => setOpen(true)}>Open modal</ControllerButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Test modal">
        <p>Modal body</p>
      </Modal>
    </div>
  )
}

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hidden">
        content
      </Modal>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders as a dialog when open with the given title as its accessible name', () => {
    render(
      <Modal open onClose={() => {}} title="Visible modal">
        content
      </Modal>
    )
    expect(screen.getByRole('dialog', { name: 'Visible modal' })).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Escape me">
        content
      </Modal>
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('restores focus to the invoking element on close (spec §5.2 rule 2)', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const opener = screen.getByRole('button', { name: 'Open modal' })
    await user.click(opener)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })
})
