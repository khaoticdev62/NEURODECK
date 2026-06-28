import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CrashReportStore } from '../CrashReportStore'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-crash-reports-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function createStore(): CrashReportStore {
  let sequence = 0
  return new CrashReportStore(
    join(dir, 'crash-reports.json'),
    () => Date.UTC(2026, 5, 28, 12, 0, sequence++),
    () => `crash-${sequence}`
  )
}

describe('CrashReportStore', () => {
  it('persists renderer boundary reports newest first', async () => {
    const store = createStore()

    await store.recordRendererError({
      message: 'First failure',
      stack: 'stack-a',
      componentStack: 'component-a',
      route: '/#/about',
      code: 'TypeError',
      correlationId: 'corr-a'
    })
    await store.recordRendererError({
      message: 'Second failure',
      route: '/#/system',
      correlationId: 'corr-b'
    })

    const reports = await store.list()

    expect(reports).toHaveLength(2)
    expect(reports[0]).toMatchObject({
      kind: 'renderer-error-boundary',
      message: 'Second failure',
      route: '/#/system',
      correlationId: 'corr-b',
      storedLocallyOnly: true
    })
    expect(reports[1]).toMatchObject({
      message: 'First failure',
      stack: 'stack-a',
      componentStack: 'component-a',
      code: 'TypeError'
    })
  })

  it('records process-gone and main exception reports', async () => {
    const store = createStore()

    await store.recordRendererProcessGone({ reason: 'crashed', exitCode: 139 })
    await store.recordMainUncaughtException(new Error('Main failed'))

    const reports = await store.list()

    expect(reports.map((report) => report.kind)).toEqual([
      'main-uncaught-exception',
      'renderer-process-gone'
    ])
    expect(reports[1]).toMatchObject({
      message: 'Renderer process ended: crashed',
      reason: 'crashed',
      exitCode: 139
    })
  })

  it('bounds retained reports and truncates oversized details', async () => {
    const store = createStore()

    for (let index = 0; index < 105; index += 1) {
      await store.recordRendererError({
        message: `Failure ${index} ${'x'.repeat(700)}`,
        stack: 's'.repeat(9_000)
      })
    }

    const reports = await store.list()

    expect(reports).toHaveLength(100)
    expect(reports[0].message).toContain('...[truncated]')
    expect(reports[0].message.length).toBeLessThanOrEqual(500)
    expect(reports[0].stack?.length).toBeLessThanOrEqual(8_000)
    expect(reports.at(-1)?.message).toContain('Failure 5')
  })
})
