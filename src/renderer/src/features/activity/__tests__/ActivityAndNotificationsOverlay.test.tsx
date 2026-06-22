import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../../../components/overlays/Toast'
import { useToast } from '../../../components/overlays/useToast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { ActivityAndNotificationsOverlay } from '../ActivityAndNotificationsOverlay'

function PushButton(): React.JSX.Element {
  const { push } = useToast()
  return (
    <button type="button" onClick={() => push({ category: 'warning', title: 'Disk space low' })}>
      Push
    </button>
  )
}

function renderOverlay(adapter: TestAdapter): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[adapter]}>
        <PushButton />
        <ActivityAndNotificationsOverlay />
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('ActivityAndNotificationsOverlay', () => {
  it('opens on the real "activity" controller action (View button / V key)', () => {
    const adapter = new TestAdapter()
    renderOverlay(adapter)

    act(() => adapter.inject('activity', 'press'))

    expect(screen.getByRole('dialog', { name: 'Activity and Notifications' })).toBeInTheDocument()
  })

  it('defaults to the Activity tab showing an honest empty state', () => {
    const adapter = new TestAdapter()
    renderOverlay(adapter)
    act(() => adapter.inject('activity', 'press'))

    expect(screen.getByText('No activity yet')).toBeInTheDocument()
  })

  it('switching to Notifications shows real pushed notifications, not fabricated ones', async () => {
    const adapter = new TestAdapter()
    const user = userEvent.setup()
    renderOverlay(adapter)
    await user.click(screen.getByRole('button', { name: 'Push' }))
    act(() => adapter.inject('activity', 'press'))

    await user.click(screen.getByRole('button', { name: 'Notifications' }))

    expect(within(screen.getByRole('dialog')).getByText('Disk space low')).toBeInTheDocument()
  })

  it('shows "No notifications yet" before anything has been pushed', async () => {
    const adapter = new TestAdapter()
    const user = userEvent.setup()
    renderOverlay(adapter)
    act(() => adapter.inject('activity', 'press'))

    await user.click(screen.getByRole('button', { name: 'Notifications' }))

    expect(screen.getByText('No notifications yet')).toBeInTheDocument()
  })

  it('closes on the real "back" controller action', () => {
    const adapter = new TestAdapter()
    renderOverlay(adapter)
    act(() => adapter.inject('activity', 'press'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    act(() => adapter.inject('back', 'press'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
