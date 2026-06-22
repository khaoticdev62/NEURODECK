import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CriticalConfirmationDialog } from '../CriticalConfirmationDialog'

describe('CriticalConfirmationDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not confirm on a quick tap (cannot be accepted accidentally, spec §9.2)', () => {
    const onConfirm = vi.fn()
    render(
      <CriticalConfirmationDialog
        open
        title="Delete workspace"
        action="Delete"
        target="my-workspace"
        consequence="All files in this workspace are permanently removed"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    )

    const button = screen.getByRole('button', { name: 'Hold to confirm' })
    fireEvent.pointerDown(button)
    fireEvent.pointerUp(button)
    vi.advanceTimersByTime(700)

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('confirms after holding for the full 700ms', () => {
    const onConfirm = vi.fn()
    render(
      <CriticalConfirmationDialog
        open
        title="Delete workspace"
        action="Delete"
        target="my-workspace"
        consequence="All files in this workspace are permanently removed"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    )

    const button = screen.getByRole('button', { name: 'Hold to confirm' })
    fireEvent.pointerDown(button)
    vi.advanceTimersByTime(700)

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('blocks the hold until the required phrase is typed exactly', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <CriticalConfirmationDialog
        open
        title="Delete workspace"
        action="Delete"
        target="my-workspace"
        consequence="All files in this workspace are permanently removed"
        requiredPhrase="DELETE"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    )

    const button = screen.getByRole('button', { name: 'Hold to confirm' })
    expect(button).toBeDisabled()

    await user.type(screen.getByRole('textbox'), 'DELETE')
    expect(button).toBeEnabled()
  })
})
