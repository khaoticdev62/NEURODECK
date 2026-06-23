import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CreateAgentRequest } from '@shared/contracts/agent'
import { AgentStore } from '../AgentStore'

let dir: string
let store: AgentStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-agents-'))
  store = new AgentStore(join(dir, 'agents.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function request(overrides: Partial<CreateAgentRequest> = {}): CreateAgentRequest {
  return {
    name: 'Repository Maintainer',
    role: 'Code reviewer',
    goal: 'Find actionable risks',
    workspaceId: 'workspace-1',
    modelProfile: 'private-workspace',
    toolAllowlist: ['files.read'],
    permissionCeiling: ['workspace.read'],
    resourceLimits: { maxTokens: 512, timeoutMs: 5000, maxToolCalls: 4 },
    childAgentPolicy: { allowChildAgents: false, maxChildrenPerRun: 0, maxDepth: 0 },
    enabled: true,
    ...overrides
  }
}

describe('AgentStore', () => {
  it('starts with no agents', async () => {
    expect(await store.list()).toEqual([])
  })

  it('creates and lists agents, scoped to a workspace', async () => {
    await store.create(request())
    await store.create(request({ workspaceId: 'workspace-2' }))

    expect(await store.list()).toHaveLength(2)
    expect(await store.list('workspace-1')).toHaveLength(1)
  })

  it('updates a real agent definition', async () => {
    const agent = await store.create(request())
    const updated = await store.update(agent.id, request({ name: 'Renamed Agent' }))

    expect(updated.name).toBe('Renamed Agent')
    expect(updated.id).toBe(agent.id)
    expect(updated.updatedAt).toBeGreaterThanOrEqual(agent.updatedAt)
  })

  it('rejects updating an agent that does not exist', async () => {
    await expect(store.update('missing', request())).rejects.toThrow(/not found/)
  })

  it('toggles enabled state', async () => {
    const agent = await store.create(request())
    const disabled = await store.setEnabled(agent.id, false)

    expect(disabled.enabled).toBe(false)
    expect((await store.get(agent.id))?.enabled).toBe(false)
  })

  it('removes an agent', async () => {
    const agent = await store.create(request())
    await store.remove(agent.id)

    expect(await store.get(agent.id)).toBeUndefined()
  })
})
