import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { useAiSafety } from '../../../ai-safety/useAiSafety'
import { ExecutionTimeline } from '../ExecutionTimeline'

const TOOL = {
  id: 'demo-tool',
  title: 'Demo Tool',
  description: 'Does something low-risk',
  requiredCapability: 'system.changeSettings' as const,
  risk: 'low' as const,
  reversible: true,
  run: async () => ({ success: true, message: 'completed successfully' })
}

function Bootstrap(): null {
  const { registry } = useAiSafety()
  registry.register(TOOL)
  return null
}

describe('ExecutionTimeline', () => {
  it('shows an honest empty state when nothing has been submitted', () => {
    render(
      <AiSafetyProvider>
        <Bootstrap />
        <ExecutionTimeline />
      </AiSafetyProvider>
    )
    expect(screen.getByText('No actions submitted yet')).toBeInTheDocument()
  })

  it('shows a granted action moving through running to passed, with the real result message', async () => {
    function Submit(): null {
      const { queue, broker } = useAiSafety()
      broker.grant('system.changeSettings', 'session')
      queue.submit('demo-tool')
      return null
    }
    render(
      <AiSafetyProvider>
        <Bootstrap />
        <Submit />
        <ExecutionTimeline />
      </AiSafetyProvider>
    )

    await waitFor(() => expect(screen.getByText('Passed')).toBeInTheDocument())
    expect(screen.getByText('completed successfully')).toBeInTheDocument()
  })

  it('a pending action can be cancelled from the timeline', async () => {
    function Submit(): null {
      const { queue } = useAiSafety()
      queue.submit('demo-tool')
      return null
    }
    const user = userEvent.setup()
    render(
      <AiSafetyProvider>
        <Bootstrap />
        <Submit />
        <ExecutionTimeline />
      </AiSafetyProvider>
    )

    expect(screen.getByText('Waiting for approval')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })
})
