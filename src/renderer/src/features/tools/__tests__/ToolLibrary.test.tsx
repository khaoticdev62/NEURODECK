import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { useAiSafety } from '../../../ai-safety/useAiSafety'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { ToolLibrary } from '../ToolLibrary'

function RegisterTestTools(): null {
  const { registry, broker, audit } = useAiSafety()
  if (!registry.get('demo-tool-a')) {
    registry.register({
      id: 'demo-tool-a',
      title: 'Demo Tool A',
      description: 'A real registered low-risk tool.',
      requiredCapability: 'system.changeSettings',
      risk: 'low',
      reversible: true,
      run: async () => ({ success: true, message: 'ok' })
    })
    registry.register({
      id: 'demo-tool-b',
      title: 'Demo Tool B',
      description: 'A real registered high-risk tool.',
      requiredCapability: 'files.write',
      risk: 'high',
      reversible: false,
      run: async () => ({ success: true, message: 'ok' })
    })
    broker.grant('system.changeSettings', 'session')
    audit.record({
      actionId: 'a1',
      tool: 'demo-tool-a',
      capability: 'system.changeSettings',
      outcome: 'executed'
    })
  }
  return null
}

function renderScreen(): ReturnType<typeof render> {
  return render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <AiSafetyProvider>
        <RegisterTestTools />
        <ToolLibrary />
      </AiSafetyProvider>
    </FocusEngineProvider>
  )
}

describe('ToolLibrary', () => {
  it('lists every real registered tool with its real permission state', () => {
    renderScreen()

    expect(screen.getAllByText('Demo Tool A').length).toBeGreaterThan(0)
    expect(screen.getByText('Demo Tool B')).toBeInTheDocument()
    expect(screen.getAllByText('granted').length).toBeGreaterThan(0)
    expect(screen.getByText('requires-approval')).toBeInTheDocument()
  })

  it('shows full real detail for the selected tool, including risk and reversibility', () => {
    renderScreen()

    expect(screen.getByText('A real registered low-risk tool.')).toBeInTheDocument()
    expect(screen.getByText('system.changeSettings')).toBeInTheDocument()
    expect(screen.getAllByText('low').length).toBeGreaterThan(0)
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('shows real recorded audit usage for the selected tool', () => {
    renderScreen()

    expect(screen.getByText('executed')).toBeInTheDocument()
  })

  it('switches detail to a different tool when selected', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /Demo Tool B/ }))

    expect(screen.getByText('A real registered high-risk tool.')).toBeInTheDocument()
    expect(screen.getByText('files.write')).toBeInTheDocument()
    expect(screen.getByText('No recorded invocations yet.')).toBeInTheDocument()
  })
})
