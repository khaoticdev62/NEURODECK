import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ModelCompletionResult } from '@shared/contracts/model'
import type { AgentDefinition, AgentRun, AgentState } from '@shared/contracts/agent'
import { AgentRuntime, type AgentModelPort } from '../AgentRuntime'
import { AgentStore } from '../AgentStore'

const directories: string[] = []
afterEach(async () =>
  Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
)

describe('AgentRuntime', () => {
  it('persists a bounded visible lifecycle and real model output', async () => {
    const store = await createStore()
    const agent = await createAgent(store)
    const complete = vi.fn().mockResolvedValue(completion())
    const runtime = new AgentRuntime(store, { complete })

    const started = await runtime.start(agent.id, 'Inspect the repository')
    const finished = await waitForRun(store, started.id, 'completed')

    expect(finished.output).toBe('1. Inspect files\n2. Report findings')
    expect(finished.timeline.map((event) => event.state)).toEqual(['planning', 'completed'])
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'private-workspace', workspacePrivate: true }),
      expect.any(AbortSignal)
    )
    expect(complete.mock.calls[0][0].messages[0].content).toContain('Allowed tools: files.read')
  })

  it('aborts and persists cancellation without losing its timeline event', async () => {
    const store = await createStore()
    const agent = await createAgent(store)
    const model: AgentModelPort = {
      complete: (_request, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Cancelled', 'AbortError')),
            { once: true }
          )
        })
    }
    const runtime = new AgentRuntime(store, model)
    const started = await runtime.start(agent.id, 'Wait forever')
    await runtime.cancel(started.id)
    const cancelled = await waitForRun(store, started.id, 'cancelled')
    expect(cancelled.timeline.map((event) => event.state)).toEqual([
      'planning',
      'cancelling',
      'cancelled'
    ])
  })
})

async function createStore(): Promise<AgentStore> {
  const directory = await mkdtemp(join(tmpdir(), 'ndx-agent-'))
  directories.push(directory)
  return new AgentStore(join(directory, 'agents.json'))
}

async function createAgent(store: AgentStore): Promise<AgentDefinition> {
  return store.create({
    name: 'Repository Maintainer',
    role: 'Code reviewer',
    goal: 'Find actionable risks',
    workspaceId: 'workspace-1',
    modelProfile: 'private-workspace',
    toolAllowlist: ['files.read'],
    permissionCeiling: ['workspace.read'],
    resourceLimits: { maxTokens: 512, timeoutMs: 5000, maxToolCalls: 4 },
    enabled: true
  })
}

function completion(): ModelCompletionResult {
  return {
    providerId: 'provider-1',
    providerName: 'Local',
    modelId: 'coder',
    local: true,
    profileId: 'private-workspace',
    content: '1. Inspect files\n2. Report findings',
    usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 },
    durationMs: 25
  }
}

async function waitForRun(store: AgentStore, runId: string, state: AgentState): Promise<AgentRun> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const run = await store.getRun(runId)
    if (run?.state === state) return run
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`Run did not reach ${state}.`)
}
