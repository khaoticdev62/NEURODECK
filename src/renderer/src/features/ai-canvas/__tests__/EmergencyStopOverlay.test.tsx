import { act, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import type { AiSafetyContextValue } from '../../../ai-safety/AiSafetyContext'
import { useAiSafety } from '../../../ai-safety/useAiSafety'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { EmergencyStopOverlay } from '../EmergencyStopOverlay'

const TOOL = {
  id: 'demo-tool',
  title: 'Demo Tool',
  description: '',
  requiredCapability: 'system.changeSettings' as const,
  risk: 'low' as const,
  reversible: true,
  run: async () => ({ success: true, message: 'done' })
}

function Bootstrap(): null {
  const { registry } = useAiSafety()
  registry.register(TOOL)
  return null
}

function renderOverlay(adapter: TestAdapter): ReturnType<typeof render> {
  return render(
    <FocusEngineProvider adapters={[adapter]}>
      <AiSafetyProvider>
        <Bootstrap />
        <MemoryRouter>
          <EmergencyStopOverlay />
        </MemoryRouter>
      </AiSafetyProvider>
    </FocusEngineProvider>
  )
}

describe('EmergencyStopOverlay', () => {
  it('opens and pauses the queue on the real "emergency.stop" action (Menu+B / F1)', () => {
    const adapter = new TestAdapter()
    renderOverlay(adapter)

    act(() => adapter.inject('emergency.stop', 'press'))

    expect(screen.getByRole('dialog', { name: 'Emergency Stop Active' })).toBeInTheDocument()
  })

  it('cancels a pending action when emergency stop fires', () => {
    const adapter = new TestAdapter()
    const holder: { current?: AiSafetyContextValue } = {}
    function Capture(): null {
      const safety = useAiSafety()
      useEffect(() => {
        holder.current = safety
        safety.queue.submit('demo-tool')
      }, [safety])
      return null
    }
    render(
      <FocusEngineProvider adapters={[adapter]}>
        <AiSafetyProvider>
          <Bootstrap />
          <Capture />
          <MemoryRouter>
            <EmergencyStopOverlay />
          </MemoryRouter>
        </AiSafetyProvider>
      </FocusEngineProvider>
    )
    expect(holder.current?.queue.list()[0].status).toBe('pending-approval')

    act(() => adapter.inject('emergency.stop', 'press'))

    expect(holder.current?.queue.list()[0].status).toBe('cancelled')
  })

  it('toggles: a second "emergency.stop" press resumes and closes the dialog', () => {
    const adapter = new TestAdapter()
    renderOverlay(adapter)

    act(() => adapter.inject('emergency.stop', 'press'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    act(() => adapter.inject('emergency.stop', 'press'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('"Keep paused" closes the dialog without resuming', () => {
    const adapter = new TestAdapter()
    renderOverlay(adapter)
    act(() => adapter.inject('emergency.stop', 'press'))

    act(() => screen.getByRole('button', { name: 'Keep paused' }).click())

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
