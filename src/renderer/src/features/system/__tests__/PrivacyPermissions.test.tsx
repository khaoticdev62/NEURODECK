import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrowserPermission, NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { useAiSafety } from '../../../ai-safety/useAiSafety'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { PrivacyPermissions } from '../PrivacyPermissions'

/** Registers a real test tool directly during render (registry has no onChange, so an effect-based registration in a sibling wouldn't re-render PrivacyPermissions before it reads the registry). */
function RegisterTestTool({ grant }: { grant: boolean }): null {
  const { registry, broker } = useAiSafety()
  if (!registry.get('demo-tool')) {
    registry.register({
      id: 'demo-tool',
      title: 'Demo tool',
      description: 'A real registered tool used for this test.',
      requiredCapability: 'system.changeSettings',
      risk: 'low',
      reversible: true,
      run: async () => ({ success: true, message: 'ok' })
    })
  }
  if (grant) broker.grant('system.changeSettings', 'session')
  return null
}

afterEach(() => {
  // @ts-expect-error test-only cleanup
  delete window.ndx
})

function renderScreen(grant = false): ReturnType<typeof render> {
  return render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <AiSafetyProvider>
        <RegisterTestTool grant={grant} />
        <PrivacyPermissions />
      </AiSafetyProvider>
    </FocusEngineProvider>
  )
}

describe('PrivacyPermissions', () => {
  it('shows a real registered tool with its real required capability', () => {
    renderScreen()
    expect(screen.getByText('system.changeSettings')).toBeInTheDocument()
    expect(screen.getByText('Requires approval')).toBeInTheDocument()
  })

  it('shows honestly deferred views with a real reason', () => {
    renderScreen()
    expect(
      screen.getByText(/No per-provider data-handling policy store exists/)
    ).toBeInTheDocument()
  })

  it('revokes a real grant immediately via the broker', async () => {
    const user = userEvent.setup()
    renderScreen(true)

    expect(screen.getByText('Granted')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Revoke' })[0])
    const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' })
    await user.click(revokeButtons[revokeButtons.length - 1])

    expect(screen.queryByText('Granted')).not.toBeInTheDocument()
    expect(screen.getByText('Requires approval')).toBeInTheDocument()
  })

  it('shows the real empty audit history state', () => {
    renderScreen()
    expect(screen.getByText(/No audited actions yet/)).toBeInTheDocument()
  })

  it('lists stored browser permissions', async () => {
    const permission: BrowserPermission = {
      origin: 'https://example.com',
      permission: 'notifications',
      granted: true,
      createdAt: 1,
      updatedAt: 1
    }
    window.ndx = {
      browserTabs: {
        listPermissions: vi.fn().mockResolvedValue({ ok: true, data: [permission] }),
        revokePermission: vi.fn()
      }
    } as unknown as NdxBridge

    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('https://example.com')).toBeInTheDocument()
      expect(screen.getByText('notifications')).toBeInTheDocument()
      expect(screen.getByText('Allowed')).toBeInTheDocument()
    })
  })

  it('revokes a browser permission and refreshes the list', async () => {
    const permission: BrowserPermission = {
      origin: 'https://example.com',
      permission: 'notifications',
      granted: true,
      createdAt: 1,
      updatedAt: 1
    }
    const revoke = vi.fn().mockResolvedValue({ ok: true, data: null })
    window.ndx = {
      browserTabs: {
        listPermissions: vi
          .fn()
          .mockResolvedValueOnce({ ok: true, data: [permission] })
          .mockResolvedValueOnce({ ok: true, data: [] }),
        revokePermission: revoke
      }
    } as unknown as NdxBridge

    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('https://example.com')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() => {
      expect(revoke).toHaveBeenCalledWith({
        origin: 'https://example.com',
        permission: 'notifications'
      })
      expect(screen.queryByText('https://example.com')).not.toBeInTheDocument()
    })
  })
})
