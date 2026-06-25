import { render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { useAiSafety } from '../../../ai-safety/useAiSafety'
import { AgentToolExecutionBridge } from '../AgentToolExecutionBridge'

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

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('AgentToolExecutionBridge', () => {
  it('threads the requesting agentId/runId onto the real ActionQueue submission', async () => {
    let toolRequestHandler: ((request: unknown) => void) | undefined
    const reportToolResult = vi.fn().mockResolvedValue({ ok: true, data: null })
    window.ndx = {
      agentRuns: {
        onToolRequest: (handler: (request: unknown) => void) => {
          toolRequestHandler = handler
          return () => undefined
        },
        reportToolResult
      }
    } as unknown as NdxBridge

    const holder: { current?: ReturnType<typeof useAiSafety> } = {}
    function Capture(): null {
      const safety = useAiSafety()
      useEffect(() => {
        holder.current = safety
      }, [safety])
      return null
    }

    render(
      <AiSafetyProvider>
        <Bootstrap />
        <Capture />
        <AgentToolExecutionBridge />
      </AiSafetyProvider>
    )

    await waitFor(() => expect(toolRequestHandler).toBeDefined())

    toolRequestHandler?.({
      requestId: 'req-1',
      runId: 'run-1',
      agentId: 'agent-1',
      workspaceId: 'w1',
      objective: 'Test',
      toolId: 'demo-tool',
      arguments: {},
      permissionCeiling: ['system.changeSettings'],
      goal: 'Test goal'
    })

    await waitFor(() => {
      const record = holder.current?.queue.list()[0]
      expect(record?.action.agentId).toBe('agent-1')
      expect(record?.action.runId).toBe('run-1')
    })
  })
})
