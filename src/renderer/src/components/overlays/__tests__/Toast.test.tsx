import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../Toast'
import { useToast } from '../useToast'

function PushButton({
  category = 'information' as const,
  durationMs
}: {
  category?:
    | 'information'
    | 'success'
    | 'warning'
    | 'error'
    | 'approval-required'
    | 'background-task-complete'
  durationMs?: number
}): React.JSX.Element {
  const { push } = useToast()
  return (
    <button
      type="button"
      onClick={() => push({ category, title: 'Something happened', durationMs })}
    >
      Push toast
    </button>
  )
}

describe('Toast', () => {
  it('renders a pushed toast with its category label', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <PushButton category="approval-required" />
      </ToastProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Push toast' }))

    expect(screen.getByText('Something happened')).toBeInTheDocument()
    expect(screen.getByText('Approval required')).toBeInTheDocument()
  })

  it('dismisses when the dismiss button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <PushButton />
      </ToastProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Push toast' }))
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByText('Something happened')).not.toBeInTheDocument()
  })

  it('auto-dismisses after durationMs', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <PushButton durationMs={50} />
      </ToastProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Push toast' }))
    expect(screen.getByText('Something happened')).toBeInTheDocument()

    await waitFor(() => expect(screen.queryByText('Something happened')).not.toBeInTheDocument())
  })

  it('renders the toast host as aria-live polite so it never steals focus (spec §6.4)', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <PushButton />
      </ToastProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Push toast' }))
    const host = screen.getByText('Something happened').closest('[aria-live="polite"]')
    expect(host).not.toBeNull()
  })
})
