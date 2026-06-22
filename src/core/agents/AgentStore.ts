import { randomUUID } from 'node:crypto'
import type { AgentDefinition, AgentRun, CreateAgentRequest } from '@shared/contracts/agent'
import { JsonStore } from '../persistence/JsonStore'

interface AgentIndex {
  agents: AgentDefinition[]
  runs: AgentRun[]
}

export class AgentStore {
  private readonly store: JsonStore<AgentIndex>

  constructor(filePath: string) {
    this.store = new JsonStore(filePath, { agents: [], runs: [] })
  }

  async list(workspaceId?: string): Promise<AgentDefinition[]> {
    const index = await this.store.read()
    return workspaceId
      ? index.agents.filter((agent) => agent.workspaceId === workspaceId)
      : index.agents
  }

  async get(agentId: string): Promise<AgentDefinition | undefined> {
    return (await this.store.read()).agents.find((agent) => agent.id === agentId)
  }

  async create(request: CreateAgentRequest): Promise<AgentDefinition> {
    const now = Date.now()
    const agent: AgentDefinition = { ...request, id: randomUUID(), createdAt: now, updatedAt: now }
    const index = await this.store.read()
    await this.store.write({ ...index, agents: [...index.agents, agent] })
    return agent
  }

  async update(agentId: string, request: CreateAgentRequest): Promise<AgentDefinition> {
    const index = await this.store.read()
    const existing = index.agents.find((agent) => agent.id === agentId)
    if (!existing) throw new Error('Agent not found.')
    const updated: AgentDefinition = { ...existing, ...request, updatedAt: Date.now() }
    await this.store.write({
      ...index,
      agents: index.agents.map((agent) => (agent.id === agentId ? updated : agent))
    })
    return updated
  }

  async setEnabled(agentId: string, enabled: boolean): Promise<AgentDefinition> {
    const index = await this.store.read()
    const existing = index.agents.find((agent) => agent.id === agentId)
    if (!existing) throw new Error('Agent not found.')
    const updated: AgentDefinition = { ...existing, enabled, updatedAt: Date.now() }
    await this.store.write({
      ...index,
      agents: index.agents.map((agent) => (agent.id === agentId ? updated : agent))
    })
    return updated
  }

  async remove(agentId: string): Promise<void> {
    const index = await this.store.read()
    await this.store.write({
      ...index,
      agents: index.agents.filter((agent) => agent.id !== agentId)
    })
  }

  async saveRun(run: AgentRun): Promise<void> {
    const index = await this.store.read()
    const runs = index.runs.some((item) => item.id === run.id)
      ? index.runs.map((item) => (item.id === run.id ? run : item))
      : [...index.runs, run]
    await this.store.write({ ...index, runs })
  }

  async getRun(runId: string): Promise<AgentRun | undefined> {
    return (await this.store.read()).runs.find((run) => run.id === runId)
  }

  async listRuns(agentId?: string): Promise<AgentRun[]> {
    const runs = (await this.store.read()).runs
    return (agentId ? runs.filter((run) => run.agentId === agentId) : runs).sort(
      (left, right) => right.updatedAt - left.updatedAt
    )
  }
}
