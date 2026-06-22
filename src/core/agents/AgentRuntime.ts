import { randomUUID } from 'node:crypto'
import type { AgentDefinition, AgentRun, AgentState } from '@shared/contracts/agent'
import type { ModelCompletionRequest, ModelCompletionResult } from '@shared/contracts/model'
import type { AgentStore } from './AgentStore'

export interface AgentModelPort {
  complete(request: ModelCompletionRequest, signal?: AbortSignal): Promise<ModelCompletionResult>
}

/** A visible, bounded agent lifecycle. This slice plans through a real model but does not execute tools. */
export class AgentRuntime {
  private readonly controllers = new Map<string, AbortController>()

  constructor(
    private readonly store: AgentStore,
    private readonly model: AgentModelPort
  ) {}

  async start(agentId: string, objective: string): Promise<AgentRun> {
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
      createdAt: now,
      updatedAt: now
    }
    run = this.event(run, 'planning', 'Planning with the configured model profile.')
    await this.store.saveRun(run)
    const controller = new AbortController()
    this.controllers.set(run.id, controller)
    void this.execute(agent, run, controller)
    return run
  }

  async cancel(runId: string): Promise<AgentRun> {
    const run = await this.requireRun(runId)
    if (terminal(run.state)) return run
    const cancelling = this.event(run, 'cancelling', 'Cancellation requested by the user.')
    await this.store.saveRun(cancelling)
    this.controllers.get(runId)?.abort()
    return cancelling
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
      run = this.event(
        run,
        'completed',
        'Model planning completed.',
        completion.modelId,
        completion.providerId
      )
      run.output = completion.content
      run.promptTokens = completion.usage.promptTokens
      run.completionTokens = completion.usage.completionTokens
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
      await this.store.saveRun(run)
    }
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
    `Propose a concise plan. Do not claim to execute tools or modify files.`
  ].join('\n')
}

function terminal(state: AgentState): boolean {
  return ['cancelled', 'failed', 'completed', 'rolled-back'].includes(state)
}
