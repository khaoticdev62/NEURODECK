import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { ToastProvider } from '../../components/overlays/Toast'
import { useToast } from '../../components/overlays/useToast'
import { NotificationPolicyProvider } from '../notificationPolicy'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function PushButton({
  category
}: {
  category: 'information' | 'error' | 'approval-required'
}): React.JSX.Element {
  const { push } = useToast()
  return (
    <button type="button" onClick={() => push({ category, title: `${category} fired` })}>
      Push {category}
    </button>
  )
}

describe('NotificationPolicyProvider', () => {
  it('mutes a real toast category from persisted policy on mount', async () => {
    stubBridge({
      notificationPolicy: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            mutedCategories: ['information'],
            quietHoursEnabled: false,
            quietHoursStart: '22:00',
            quietHoursEnd: '07:00'
          }
        })
      } as never
    })
    const user = userEvent.setup()

    render(
      <ToastProvider>
        <NotificationPolicyProvider>
          <PushButton category="information" />
        </NotificationPolicyProvider>
      </ToastProvider>
    )

    await user.click(await screen.findByRole('button', { name: 'Push information' }))

    expect(screen.queryByText('information fired')).not.toBeInTheDocument()
  })

  it('never mutes error or approval-required, even if persisted policy somehow included it', async () => {
    stubBridge({
      notificationPolicy: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            mutedCategories: [],
            quietHoursEnabled: false,
            quietHoursStart: '22:00',
            quietHoursEnd: '07:00'
          }
        })
      } as never
    })
    const user = userEvent.setup()

    render(
      <ToastProvider>
        <NotificationPolicyProvider>
          <PushButton category="error" />
        </NotificationPolicyProvider>
      </ToastProvider>
    )

    await user.click(await screen.findByRole('button', { name: 'Push error' }))

    expect(await screen.findByText('error fired')).toBeInTheDocument()
  })
})
