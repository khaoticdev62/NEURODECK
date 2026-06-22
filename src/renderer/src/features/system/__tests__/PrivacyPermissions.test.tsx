import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
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
})
