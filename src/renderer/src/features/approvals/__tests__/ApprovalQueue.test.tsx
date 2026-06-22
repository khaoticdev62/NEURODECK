import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { useAiSafety } from '../../../ai-safety/useAiSafety'
import { ApprovalQueue } from '../ApprovalQueue'

const LOW_RISK_TOOL = {
  id: 'demo-tool',
  title: 'Demo Tool',
  description: 'Does something low-risk',
  requiredCapability: 'system.changeSettings' as const,
  risk: 'low' as const,
  reversible: true,
  run: async () => ({ success: true, message: 'done' })
}

function Bootstrap(): null {
  const { registry } = useAiSafety()
  registry.register(LOW_RISK_TOOL)
  return null
}

function renderQueue(): ReturnType<typeof render> {
  return render(
    <AiSafetyProvider>
      <Bootstrap />
      <ApprovalQueue />
    </AiSafetyProvider>
  )
}

describe('ApprovalQueue', () => {
  it('shows an honest empty state when nothing is pending', () => {
    renderQueue()
    expect(screen.getByText('No approvals waiting')).toBeInTheDocument()
  })

  it('shows a real pending action with its spec-required fields', () => {
    function Submit(): null {
      const { queue } = useAiSafety()
      queue.submit('demo-tool')
      return null
    }
    render(
      <AiSafetyProvider>
        <Bootstrap />
        <Submit />
        <ApprovalQueue />
      </AiSafetyProvider>
    )

    expect(screen.getByText('REQUEST: Demo Tool')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('low')).toBeInTheDocument()
  })

  it('approving runs the real tool and removes it from the pending queue', async () => {
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
        <ApprovalQueue />
      </AiSafetyProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Approve once' }))

    expect(screen.getByText('No approvals waiting')).toBeInTheDocument()
  })

  it('denying removes it from the pending queue without running the tool', async () => {
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
        <ApprovalQueue />
      </AiSafetyProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Deny' }))

    expect(screen.getByText('No approvals waiting')).toBeInTheDocument()
  })
})
