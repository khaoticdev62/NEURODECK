import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ContinuityStore } from '../ContinuityStore'

let dir: string
let now = 1_000

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'continuity-store-'))
  now = 1_000
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function store(): ContinuityStore {
  let id = 0
  return new ContinuityStore(
    join(dir, 'continuity.json'),
    () => now,
    () => `event-${++id}`
  )
}

describe('ContinuityStore', () => {
  it('starts with an honest empty queue and safe mode disabled', async () => {
    const continuity = store()

    await expect(continuity.getState()).resolves.toMatchObject({
      safeModeActive: false,
      offlineQueue: [],
      powerEvents: [],
      sessionSnapshot: null
    })
  })

  it('persists safe mode state', async () => {
    const continuity = store()

    const state = await continuity.setSafeMode(true)

    expect(state.safeModeActive).toBe(true)
    await expect(continuity.getState()).resolves.toMatchObject({ safeModeActive: true })
  })

  it('records power events with bounded history', async () => {
    const continuity = store()

    const event = await continuity.recordPowerEvent({ kind: 'suspend' })

    expect(event).toEqual({ id: 'event-1', kind: 'suspend', occurredAt: 1_000 })
    expect((await continuity.getState()).powerEvents).toEqual([event])
  })

  it('captures the latest session route', async () => {
    const continuity = store()
    now = 2_000

    const state = await continuity.saveSessionSnapshot({ route: '/profiles' })

    expect(state.sessionSnapshot).toEqual({ route: '/profiles', capturedAt: 2_000 })
  })
})
