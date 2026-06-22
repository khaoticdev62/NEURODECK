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
