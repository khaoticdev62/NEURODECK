import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { ToastProvider } from '../../../components/overlays/Toast'
import { NotificationPolicyProvider } from '../../../state/notificationPolicy'
import { NotificationPolicyScreen } from '../NotificationPolicyScreen'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function renderScreen(): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <NotificationPolicyProvider>
        <NotificationPolicyScreen />
      </NotificationPolicyProvider>
    </ToastProvider>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('NotificationPolicyScreen', () => {
  it('never offers error or approval-required as a mutable category', async () => {
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

    renderScreen()
    await screen.findByText('Muted categories')

    expect(screen.queryByRole('button', { name: 'Error' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approval required' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Information' })).toBeInTheDocument()
  })

  it('toggles a category mute and persists through the real IPC client', async () => {
    const set = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        mutedCategories: ['information'],
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00'
      }
    })
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
        }),
        set
      } as never
    })
    const user = userEvent.setup()

    renderScreen()
    await screen.findByText('Muted categories')

    await user.click(screen.getByRole('button', { name: 'Information' }))

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ mutedCategories: ['information'] }))
  })

  it('toggles quiet hours on through the real IPC client', async () => {
    const set = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        mutedCategories: [],
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00'
      }
    })
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
        }),
        set
      } as never
    })
    const user = userEvent.setup()

    renderScreen()
    const offButton = await screen.findByRole('button', { name: 'Off' })
    await user.click(offButton)

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ quietHoursEnabled: true }))
  })
})
