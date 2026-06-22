import { createServer, type Server } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { SystemMetricsSnapshot } from '../../system/SystemMetricsService'
import { ModelProviderService } from '../ModelProviderService'
import { ModelProviderStore } from '../ModelProviderStore'
import { ModelRouter } from '../ModelRouter'

const servers: Server[] = []
const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))
  )
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

describe('ModelRouter', () => {
  it('uses real availability, privacy rules, metrics, and completion responses', async () => {
    const localUrl = await providerServer('local-model', 'local answer')
    const cloudUrl = await providerServer('cloud-model', 'cloud answer')
    const directory = await mkdtemp(join(tmpdir(), 'ndx-router-'))
    directories.push(directory)
    const store = new ModelProviderStore(join(directory, 'providers.json'), {
      isAvailable: () => true,
      encrypt: (value) => `encrypted:${value}`,
      decrypt: (value) => value.replace(/^encrypted:/, '')
    })
    const local = await store.add({
      name: 'Local',
      kind: 'local-openai-compatible',
      baseUrl: localUrl
    })
    await store.add({
      name: 'Cloud',
      kind: 'cloud-openai-compatible',
      baseUrl: cloudUrl,
      apiKey: 'secret'
    })
    const router = new ModelRouter(store, new ModelProviderService(), {
      collect: async () => snapshot()
    })

    const privateRoute = await router.route({
      profileId: 'private-workspace',
      workspacePrivate: true,
      temperature: 0.2,
      maxTokens: 64
    })
    expect(privateRoute.providerId).toBe(local.id)
    expect(privateRoute.measured.memoryUsedPercent).toBe(75)

    const batteryRoute = await router.route({
      profileId: 'battery-saver',
      workspacePrivate: false,
      temperature: 0.2,
      maxTokens: 64
    })
    expect(batteryRoute.providerName).toBe('Cloud')

    const completion = await router.complete({
      messages: [{ role: 'user', content: 'hello' }],
      profileId: 'private-workspace',
      workspacePrivate: true,
      temperature: 0.2,
      maxTokens: 64
    })
    expect(completion.content).toBe('local answer')
    expect(completion.usage.totalTokens).toBe(5)
  })
})

async function providerServer(modelId: string, answer: string): Promise<string> {
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json')
    if (request.url === '/models') return response.end(JSON.stringify({ data: [{ id: modelId }] }))
    if (request.url === '/chat/completions')
      return response.end(
        JSON.stringify({ choices: [{ message: { content: answer } }], usage: { total_tokens: 5 } })
      )
    response.statusCode = 404
    return response.end()
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No test address')
  return `http://127.0.0.1:${address.port}`
}

function snapshot(): SystemMetricsSnapshot {
  const unavailable = { available: false, source: 'test', reason: 'not exposed' }
  return {
    collectedAt: 1,
    hostPlatform: 'linux',
    core: { pid: 1, uptimeSeconds: 1 },
    cpu: {
      available: true,
      source: 'test',
      value: { usagePercent: 10, logicalCores: 8, model: 'test' }
    },
    memory: {
      available: true,
      source: 'test',
      value: { totalBytes: 100, usedBytes: 75, availableBytes: 25, usagePercent: 75 }
    },
    swap: unavailable,
    storage: unavailable,
    battery: {
      available: true,
      source: 'test',
      value: [
        {
          name: 'BAT0',
          capacityPercent: 60,
          status: 'Discharging',
          energyNowMicrowattHours: null,
          energyFullMicrowattHours: null,
          powerNowMicrowatts: null
        }
      ]
    },
    thermal: { available: true, source: 'test', value: [{ name: 'cpu', celsius: 55 }] },
    fans: unavailable,
    gpu: unavailable,
    network: unavailable,
    processes: unavailable
  }
}
