import { useEffect } from 'react'
import type { AgentToolExecutionRequest, AgentToolExecutionResult } from '@shared/contracts'
import type { HarnessActionRecord, PlanStatus } from '../../ai-safety/contracts/plan'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import { getNdxBridge } from '../../services/ipc/ndxBridge'

const TERMINAL_STATUSES = new Set<PlanStatus>([
  'passed',
  'failed',
  'denied',
  'cancelled',
  'rolled-back'
])

/**
 * Renderer-owned bridge from Agent Runtime to the real ActionQueue.
 *
 * AgentRuntime runs in the main process because it owns persisted runs and
 * ModelRouter access. ActionQueue intentionally lives in the renderer today
 * because Approval Queue, Emergency Stop, Command Palette, and Workflow
 * execution all share that same in-memory safety pipeline. This component is
 * the narrow typed handoff between them: no tool runs here unless it passes
 * the same ToolRegistry -> PermissionBroker -> ActionQueue path every other
 * tool caller uses.
 */
export function AgentToolExecutionBridge(): null {
  const { queue, registry } = useAiSafety()

  useEffect(() => {
    const bridge = getNdxBridge()
    if (!bridge) return

    return bridge.agentRuns.onToolRequest((request) => {
      void handleToolRequest(request, queue, registry, bridge.agentRuns.reportToolResult)
    })
  }, [queue, registry])

  return null
}

async function handleToolRequest(
  request: AgentToolExecutionRequest,
  queue: ReturnType<typeof useAiSafety>['queue'],
  registry: ReturnType<typeof useAiSafety>['registry'],
  report: (result: AgentToolExecutionResult) => Promise<unknown>
): Promise<void> {
  const tool = registry.get(request.toolId)
  if (!tool) {
    await report(failed(request, `No registered tool "${request.toolId}" exists in ActionQueue.`))
    return
  }
  if (!request.permissionCeiling.includes(tool.requiredCapability)) {
    await report(
      failed(
        request,
        `Tool "${request.toolId}" requires "${tool.requiredCapability}", outside the agent permission ceiling.`
      )
    )
    return
  }

  const submitted = queue.submit(request.toolId, request.arguments, request.goal)
  if (!submitted.ok) {
    await report(failed(request, submitted.error))
    return
  }

  const terminal = await waitForAction(queue, submitted.record.action.id)
  await report({
    requestId: request.requestId,
    runId: request.runId,
    toolId: request.toolId,
    actionId: submitted.record.action.id,
    status: toAgentStatus(terminal.status),
    message: terminal.resultMessage ?? terminal.status
  })
}

function waitForAction(
  queue: ReturnType<typeof useAiSafety>['queue'],
  actionId: string
): Promise<HarnessActionRecord> {
  const existing = queue.list().find((record) => record.action.id === actionId)
  if (existing && TERMINAL_STATUSES.has(existing.status)) return Promise.resolve(existing)

  return new Promise((resolve) => {
    const unsubscribe = queue.onChange(() => {
      const record = queue.list().find((candidate) => candidate.action.id === actionId)
      if (!record || !TERMINAL_STATUSES.has(record.status)) return
      unsubscribe()
      resolve(record)
    })
  })
}

function toAgentStatus(status: PlanStatus): AgentToolExecutionResult['status'] {
  if (status === 'passed' || status === 'failed' || status === 'denied' || status === 'cancelled') {
    return status
  }
  return 'failed'
}

function failed(request: AgentToolExecutionRequest, message: string): AgentToolExecutionResult {
  return {
    requestId: request.requestId,
    runId: request.runId,
    toolId: request.toolId,
    status: 'failed',
    message
  }
}
