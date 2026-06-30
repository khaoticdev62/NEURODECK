import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BackupScheduleStore } from '../BackupScheduleStore'

describe('BackupScheduleStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'backup-schedule-store-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('defaults to disabled with a 24-hour interval', async () => {
    const store = new BackupScheduleStore(join(dir, 'schedule.json'))
    expect(await store.get()).toEqual({
      enabled: false,
      intervalHours: 24,
      lastRunAt: null,
      nextRunAt: null
    })
  })

  it('persists real settings across store instances', async () => {
    const path = join(dir, 'schedule.json')
    const first = new BackupScheduleStore(path)
    await first.set({ enabled: true, intervalHours: 6, lastRunAt: 1000, nextRunAt: 2000 })

    const second = new BackupScheduleStore(path)
    expect(await second.get()).toEqual({
      enabled: true,
      intervalHours: 6,
      lastRunAt: 1000,
      nextRunAt: 2000
    })
  })
})
