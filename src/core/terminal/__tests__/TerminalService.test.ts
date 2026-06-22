import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TerminalService, TerminalServiceError } from '../TerminalService'

let cwd: string
let service: TerminalService

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'ndx-terminal-'))
  service = new TerminalService()
})

afterEach(async () => {
  service.dispose()
  await rm(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
})

describe('TerminalService', () => {
  it('runs a real interactive PTY, streams output, resizes, snapshots, and exits', async () => {
    const session = service.create({ workspaceId: 'w1', cwd, cols: 80, rows: 24 })
    const outputPromise = waitForOutput(service, session.id, 'NDX_PTY_OK')

    service.resize(session.id, 120, 40)
    service.write(session.id, `node -e "process.stdout.write('NDX_PTY_OK')"\r`)

    await outputPromise
    const snapshot = service.snapshot(session.id)
    expect(snapshot.output).toContain('NDX_PTY_OK')
    expect(snapshot.session).toMatchObject({ cols: 120, rows: 40, status: 'running' })

    const exitPromise = waitForExit(service, session.id)
    service.terminate(session.id)
    const exited = await exitPromise
    expect(exited.status).toBe('exited')
    expect(service.snapshot(session.id).session.status).toBe('exited')
  }, 15_000)

  it('keeps multiple sessions isolated by workspace', async () => {
    const first = service.create({ workspaceId: 'w1', cwd, cols: 80, rows: 24 })
    const second = service.create({ workspaceId: 'w2', cwd, cols: 80, rows: 24 })

    expect(service.list('w1').map((session) => session.id)).toEqual([first.id])
    expect(service.list('w2').map((session) => session.id)).toEqual([second.id])

    const firstExit = waitForExit(service, first.id)
    const secondExit = waitForExit(service, second.id)
    service.terminate(first.id)
    service.terminate(second.id)
    await Promise.all([firstExit, secondExit])
  })

  it('rejects operations for unknown sessions', () => {
    expect(() => service.write('00000000-0000-4000-8000-000000000000', 'test')).toThrow(
      TerminalServiceError
    )
  })
})

function waitForOutput(
  terminalService: TerminalService,
  sessionId: string,
  expected: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe()
      reject(new Error(`Timed out waiting for terminal output: ${expected}`))
    }, 10_000)
    const unsubscribe = terminalService.onData((event) => {
      if (event.sessionId !== sessionId || !event.data.includes(expected)) return
      clearTimeout(timeout)
      unsubscribe()
      resolve()
    })
  })
}

function waitForExit(
  terminalService: TerminalService,
  sessionId: string
): Promise<{ status: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe()
      reject(new Error('Timed out waiting for terminal exit.'))
    }, 10_000)
    const unsubscribe = terminalService.onExit((event) => {
      if (event.session.id !== sessionId) return
      clearTimeout(timeout)
      unsubscribe()
      resolve(event.session)
    })
  })
}
