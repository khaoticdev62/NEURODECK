import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmationDialog } from '../ConfirmationDialog'

describe('ConfirmationDialog', () => {
  it('renders the required fields from spec §9.1', () => {
    render(
      <ConfirmationDialog
        open
        title="Delete file"
        action="Delete report.txt"
        scope="This workspace only"
        consequence="The file cannot be opened again from this view"
        recovery="Restorable from the Recovery Timeline for 30 days"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )

    expect(screen.getByText('Delete report.txt')).toBeInTheDocument()
    expect(screen.getByText('This workspace only')).toBeInTheDocument()
    expect(screen.getByText('The file cannot be opened again from this view')).toBeInTheDocument()
    expect(
      screen.getByText('Restorable from the Recovery Timeline for 30 days')
    ).toBeInTheDocument()
  })

  it('calls onConfirm and onCancel from their respective buttons', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()

    render(
      <ConfirmationDialog
        open
        title="Delete file"
        action="Delete report.txt"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
