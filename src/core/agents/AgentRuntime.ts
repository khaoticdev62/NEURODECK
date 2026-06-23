import { randomUUID } from 'node:crypto'
import {
  agentToolPlanSchema,
  type AgentDefinition,
  type AgentRun,
  type AgentState,
  type AgentToolPlan,
  type AgentToolCall,
  type AgentToolExecutionRequest,
  type AgentToolExecutionResult
} from '@shared/contracts/agent'
import type { ModelCompletionRequest, ModelCompletionResult } from '@shared/contracts/model'
import type { AgentStore } from './AgentStore'

export interface AgentModelPort {
  complete(request: ModelCompletionRequest, signal?: AbortSignal): Promise<ModelCompletionResult>
}

export type AgentToolRequestSink = (request: AgentToolExecutionRequest) => void

/** A visible, bounded agent lifecycle. Tool calls are emitted to the renderer-owned ActionQueue bridge. */
export class AgentRuntime {
  private readonly controllers = new Map<string, AbortController>()
  private readonly pausedRuns = new Set<string>()
  private readonly resumeWaiters = new Map<string, Set<() => void>>()
  private readonly pendingToolResults = new Map<
    string,
    {
      resolve: (result: AgentToolExecutionResult) => void
      reject: (error: Error) => void
    }
  >()

  constructor(
    private readonly store: AgentStore,
    private readonly model: AgentModelPort,
    private readonly onUpdate: (run: AgentRun) => void = () => {},
    private readonly onToolRequest: AgentToolRequestSink = () => {}
  ) {}

  async start(agentId: string, objective: string, dryRun = false): Promise<AgentRun> {
    const agent = await this.store.get(agentId)
    if (!agent) throw new Error('Agent not found.')
    if (!agent.enabled) throw new Error('Agent is disabled.')
    const now = Date.now()
    let run: AgentRun = {
      id: randomUUID(),
      agentId,
      workspaceId: agent.workspaceId,
      objective,
      state: 'planning',
      timeline: [],
      dryRun,
      createdAt: now,
      updatedAt: now
    }
    run = this.event(run, 'planning', 'Planning with the configured model profile.')
    await this.persist(run)
    const controller = new AbortController()
    this.controllers.set(run.id, controller)
    void this.execute(agent, run, controller)
    return run
  }

  async cancel(runId: string): Promise<AgentRun> {
    const run = await this.requireRun(runId)
    if (terminal(run.state)) return run
    const cancelling = this.event(run, 'cancelling', 'Cancellation requested by the user.')
    await this.persist(cancelling)
    this.resumePausedRun(runId)
    this.controllers.get(runId)?.abort()
    return cancelling
  }

  async pause(runId: string): Promise<AgentRun> {
    const run = await this.requireRun(runId)
    if (terminal(run.state)) return run
    this.pausedRuns.add(runId)
    const paused = this.event(
      run,
      'paused',
      'Pause requested; the agent will stop before the next tool submission.'
    )
    await this.persist(paused)
    return paused
  }

  async resume(runId: string): Promise<AgentRun> {
    const run = await this.requireRun(runId)
    if (terminal(run.state)) return run
    const resumed = this.event(run, 'queued', 'Agent run resumed.')
    await this.persist(resumed)
    this.resumePausedRun(runId)
    return resumed
  }

  private async execute(
    agent: AgentDefinition,
    initial: AgentRun,
    controller: AbortController
  ): Promise<void> {
    let run = initial
    const timeout = setTimeout(() => controller.abort(), agent.resourceLimits.timeoutMs)
    try {
      const completion = await this.model.complete(
        {
          profileId: agent.modelProfile,
          workspacePrivate: agent.modelProfile === 'private-workspace',
          temperature: 0.2,
          maxTokens: agent.resourceLimits.maxTokens,
          messages: [
            { role: 'system', content: systemPrompt(agent) },
            { role: 'user', content: initial.objective }
          ]
        },
        controller.signal
      )
      if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError')
      run = (await this.store.getRun(run.id)) ?? run
      const plan = parseAgentPlan(completion.content)
      enforceChildAgentBounds(agent, plan)
      run = this.event(
        run,
        plan.toolCalls.length > 0 ? 'queued' : 'completed',
        'Model planning completed.',
        completion.modelId,
        completion.providerId
      )
      run.output = completion.content
      run.promptTokens = completion.usage.promptTokens
      run.completionTokens = completion.usage.completionTokens
      await this.persist(run)
      run = await this.executeToolCalls(agent, run, plan.toolCalls, controller.signal)
    } catch (error) {
      run = (await this.store.getRun(run.id)) ?? run
      const cancelled =
        controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')
      run = this.event(
        run,
        cancelled ? 'cancelled' : 'failed',
        cancelled ? 'Agent run cancelled.' : 'Agent planning failed.'
      )
      if (!cancelled) run.error = error instanceof Error ? error.message : 'Unknown agent error.'
    } finally {
      clearTimeout(timeout)
      this.controllers.delete(run.id)
      this.resumePausedRun(run.id)
      await this.persist(run)
    }
  }

  async resolveToolResult(result: AgentToolExecutionResult): Promise<void> {
    const pending = this.pendingToolResults.get(result.requestId)
    if (!pending) return
    this.pendingToolResults.delete(result.requestId)
    pending.resolve(result)
  }

  private async executeToolCalls(
    agent: AgentDefinition,
    initial: AgentRun,
    toolCalls: AgentToolCall[],
    signal: AbortSignal
  ): Promise<AgentRun> {
    let run = initial
    if (toolCalls.length === 0) return run
    if (toolCalls.length > agent.resourceLimits.maxToolCalls) {
      throw new Error(
        `Agent proposed ${toolCalls.length} tool calls, exceeding the limit of ${agent.resourceLimits.maxToolCalls}.`
      )
    }

    for (const [index, call] of toolCalls.entries()) {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
      run = await this.waitIfPaused(run, signal)
      if (!agent.toolAllowlist.includes(call.toolId)) {
        throw new Error(`Agent proposed non-allowlisted tool "${call.toolId}".`)
      }

      if (run.dryRun) {
        run = this.event(
          run,
          'running',
          `Dry run: would submit tool ${index + 1}/${toolCalls.length} (${call.toolId}) with arguments ${JSON.stringify(call.arguments)} — not sent to ActionQueue.`
        )
        await this.persist(run)
        continue
      }

      run = this.event(
        run,
        'waiting-for-approval',
        `Submitting tool ${index + 1}/${toolCalls.length} (${call.toolId}) through ActionQueue.`
      )
      await this.persist(run)

      const result = await this.submitToolCall(agent, run, call, signal)
      run = (await this.store.getRun(run.id)) ?? run
      if (result.status !== 'passed') {
        throw new Error(`Tool "${call.toolId}" ${result.status}: ${result.message}`)
      }
      run = this.event(run, 'running', `Tool "${call.toolId}" completed via ActionQueue.`)
      await this.persist(run)
    }

    run = await this.waitIfPaused(run, signal)
    return this.event(
      run,
      'completed',
      run.dryRun
        ? 'Dry run completed — no tool calls were actually submitted.'
        : 'Agent run completed after approved tool execution.'
    )
  }

  private async waitIfPaused(run: AgentRun, signal: AbortSignal): Promise<AgentRun> {
    let current = run
    while (this.pausedRuns.has(current.id)) {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
      if (current.state !== 'paused') {
        current = this.event(current, 'paused', 'Agent run paused before the next tool step.')
        await this.persist(current)
      }
      await this.waitForResume(current.id, signal)
      current = (await this.store.getRun(current.id)) ?? current
      if (!terminal(current.state)) {
        current = this.event(current, 'queued', 'Agent run resumed; continuing queued work.')
        await this.persist(current)
      }
    }
    return current
  }

  private waitForResume(runId: string, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const cleanup = (): void => {
        const waiters = this.resumeWaiters.get(runId)
        waiters?.delete(done)
        if (waiters?.size === 0) this.resumeWaiters.delete(runId)
        signal.removeEventListener('abort', abort)
      }
      const done = (): void => {
        cleanup()
        resolve()
      }
      const abort = (): void => {
        cleanup()
        reject(new DOMException('Cancelled', 'AbortError'))
      }
      if (signal.aborted) {
        abort()
        return
      }
      const waiters = this.resumeWaiters.get(runId) ?? new Set<() => void>()
      waiters.add(done)
      this.resumeWaiters.set(runId, waiters)
      signal.addEventListener('abort', abort, { once: true })
    })
  }

  private resumePausedRun(runId: string): void {
    this.pausedRuns.delete(runId)
    const waiters = this.resumeWaiters.get(runId)
    if (!waiters) return
    this.resumeWaiters.delete(runId)
    waiters.forEach((waiter) => waiter())
  }

  private submitToolCall(
    agent: AgentDefinition,
    run: AgentRun,
    call: AgentToolCall,
    signal: AbortSignal
  ): Promise<AgentToolExecutionResult> {
    const requestId = randomUUID()
    return new Promise((resolve, reject) => {
      const abort = (): void => {
        this.pendingToolResults.delete(requestId)
        reject(new DOMException('Cancelled', 'AbortError') as unknown as Error)
      }
      if (signal.aborted) {
        abort()
        return
      }
      signal.addEventListener('abort', abort, { once: true })
      this.pendingToolResults.set(requestId, {
        resolve: (result) => {
          signal.removeEventListener('abort', abort)
          resolve(result)
        },
        reject
      })
      try {
        this.onToolRequest({
          requestId,
          runId: run.id,
          agentId: agent.id,
          workspaceId: agent.workspaceId,
          objective: run.objective,
          toolId: call.toolId,
          arguments: call.arguments,
          permissionCeiling: agent.permissionCeiling,
          goal: `Agent "${agent.name}" objective: ${run.objective}`
        })
      } catch (error) {
        signal.removeEventListener('abort', abort)
        this.pendingToolResults.delete(requestId)
        reject(error instanceof Error ? error : new Error('Agent tool bridge failed.'))
      }
    })
  }

  private async persist(run: AgentRun): Promise<void> {
    await this.store.saveRun(run)
    this.onUpdate(run)
  }

  private async requireRun(runId: string): Promise<AgentRun> {
    const run = await this.store.getRun(runId)
    if (!run) throw new Error('Agent run not found.')
    return run
  }

  private event(
    run: AgentRun,
    state: AgentState,
    message: string,
    modelId?: string,
    providerId?: string
  ): AgentRun {
    const at = Date.now()
    return {
      ...run,
      state,
      updatedAt: at,
      timeline: [...run.timeline, { id: randomUUID(), at, state, message, modelId, providerId }]
    }
  }
}

function systemPrompt(agent: AgentDefinition): string {
  return [
    `You are ${agent.name}. Role: ${agent.role}. Goal: ${agent.goal}.`,
    `Workspace scope: ${agent.workspaceId}.`,
    `Allowed tools: ${agent.toolAllowlist.length ? agent.toolAllowlist.join(', ') : 'none'}.`,
    `Permission ceiling: ${agent.permissionCeiling.length ? agent.permissionCeiling.join(', ') : 'none'}.`,
    `Child agent policy: ${agent.childAgentPolicy.allowChildAgents ? `up to ${agent.childAgentPolicy.maxChildrenPerRun} child agents, max depth ${agent.childAgentPolicy.maxDepth}` : 'disabled'}.`,
    `Propose a concise plan. If a tool is required, include exactly one JSON object in a fenced json block with this shape: {"toolCalls":[{"toolId":"registered.tool.id","arguments":{}}],"childAgents":[]}.`,
    `Only use allowed tools. Never claim a tool ran until the host reports it.`
  ].join('\n')
}

function terminal(state: AgentState): boolean {
  return ['cancelled', 'failed', 'completed', 'rolled-back'].includes(state)
}

function parseAgentPlan(content: string): AgentToolPlan {
  const fenced = content.match(/```json\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1] ?? (content.trim().startsWith('{') ? content.trim() : '')
  if (!candidate) return { toolCalls: [], childAgents: [] }
  const parsedJson: unknown = JSON.parse(candidate)
  const parsedPlan = agentToolPlanSchema.safeParse(parsedJson)
  if (!parsedPlan.success) throw new Error('Model returned an invalid agent tool plan.')
  return parsedPlan.data
}

function enforceChildAgentBounds(agent: AgentDefinition, plan: AgentToolPlan): void {
  if (plan.childAgents.length === 0) return
  if (!agent.childAgentPolicy.allowChildAgents) {
    throw new Error('Agent proposed child agents, but this agent policy disables child spawning.')
  }
  if (agent.childAgentPolicy.maxDepth === 0) {
    throw new Error('Agent proposed child agents, but this agent policy allows no child depth.')
  }
  if (plan.childAgents.length > agent.childAgentPolicy.maxChildrenPerRun) {
    throw new Error(
      `Agent proposed ${plan.childAgents.length} child agents, exceeding the limit of ${agent.childAgentPolicy.maxChildrenPerRun}.`
    )
  }
  throw new Error('Child agent spawning is bounded by policy but not implemented yet.')
}
