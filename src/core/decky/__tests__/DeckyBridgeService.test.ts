import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DECKY_QUICK_ACTIONS, DeckyBridgeService } from '../DeckyBridgeService'

let discoveryFilePath: string
let service: DeckyBridgeService
let focusWindow: ReturnType<typeof vi.fn<() => void>>
let navigate: ReturnType<typeof vi.fn<(path: string) => void>>

beforeEach(() => {
  discoveryFilePath = join(tmpdir(), `ndx-decky-bridge-${randomUUID()}.json`)
  focusWindow = vi.fn<() => void>()
  navigate = vi.fn<(path: string) => void>()
  service = new DeckyBridgeService(discoveryFilePath, {
    focusWindow,
    navigate,
    getAppVersion: () => '1.2.3'
  })
})

afterEach(async () => {
  await service.stop()
  await rm(discoveryFilePath, { force: true })
})

async function readToken(): Promise<string> {
  const raw = await readFile(discoveryFilePath, 'utf-8')
  return (JSON.parse(raw) as { token: string }).token
}

function baseUrl(): string {
  return `http://127.0.0.1:${service.getPort()}`
}

describe('DeckyBridgeService', () => {
  it('binds to a real loopback port and writes a real, owner-only discovery file', async () => {
    await service.start()

    expect(service.isListening()).toBe(true)
    expect(service.getPort()).toBeGreaterThan(0)

    const raw = await readFile(discoveryFilePath, 'utf-8')
    const parsed = JSON.parse(raw) as { port: number; token: string }
    expect(parsed.port).toBe(service.getPort())
    expect(parsed.token).toHaveLength(64)
  })

  it('rejects a request with no Authorization header', async () => {
    await service.start()

    const response = await fetch(`${baseUrl()}/status`)

    expect(response.status).toBe(401)
  })

  it('rejects a request with the wrong token', async () => {
    await service.start()

    const response = await fetch(`${baseUrl()}/status`, {
      headers: { Authorization: 'Bearer not-the-real-token' }
    })

    expect(response.status).toBe(401)
  })

  it('returns real status for an authorized request', async () => {
    await service.start()
    const token = await readToken()

    const response = await fetch(`${baseUrl()}/status`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const body = (await response.json()) as { running: boolean; appVersion: string }

    expect(response.status).toBe(200)
    expect(body).toEqual({ running: true, appVersion: '1.2.3' })
  })

  it('lists only the real allowlisted quick actions', async () => {
    await service.start()
    const token = await readToken()

    const response = await fetch(`${baseUrl()}/quick-actions`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const body = (await response.json()) as { actions: { id: string; label: string }[] }

    expect(body.actions).toEqual(DECKY_QUICK_ACTIONS.map(({ id, label }) => ({ id, label })))
  })

  it('focuses the real window on /focus', async () => {
    await service.start()
    const token = await readToken()

    const response = await fetch(`${baseUrl()}/focus`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })

    expect(response.status).toBe(200)
    expect(focusWindow).toHaveBeenCalledTimes(1)
  })

  it('triggers a real, allowlisted quick action by id', async () => {
    await service.start()
    const token = await readToken()
    const action = DECKY_QUICK_ACTIONS[0]

    const response = await fetch(`${baseUrl()}/quick-actions/${action.id}/trigger`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })

    expect(response.status).toBe(200)
    expect(focusWindow).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith(action.path)
  })

  it('rejects triggering an action id outside the allowlist — never a generic command channel', async () => {
    await service.start()
    const token = await readToken()

    const response = await fetch(`${baseUrl()}/quick-actions/rm-rf/trigger`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })

    expect(response.status).toBe(404)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('stops the real listener and removes the discovery file', async () => {
    await service.start()
    const port = service.getPort()

    await service.stop()

    expect(service.isListening()).toBe(false)
    await expect(fetch(`http://127.0.0.1:${port}/status`)).rejects.toThrow()
    await expect(readFile(discoveryFilePath, 'utf-8')).rejects.toThrow()
  })
})
