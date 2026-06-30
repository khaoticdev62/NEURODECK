import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackupScheduleStore } from '../BackupScheduleStore'
import { BackupScheduler, computeNextRunAt, isBackupDue } from '../BackupScheduler'
import type { BackupScheduleSettings } from '@shared/contracts'

function schedule(overrides: Partial<BackupScheduleSettings> = {}): BackupScheduleSettings {
  return { enabled: true, intervalHours: 24, lastRunAt: null, nextRunAt: null, ...overrides }
}

describe('isBackupDue', () => {
  it('is never due when disabled, regardless of nextRunAt', () => {
    expect(isBackupDue(schedule({ enabled: false, nextRunAt: 0 }), Date.now())).toBe(false)
  })

  it('is due immediately when enabled with no prior run', () => {
    expect(isBackupDue(schedule({ nextRunAt: null }), Date.now())).toBe(true)
  })

  it('is due once now reaches nextRunAt, not before', () => {
    const nextRunAt = 1_000_000
    expect(isBackupDue(schedule({ nextRunAt }), 999_999)).toBe(false)
    expect(isBackupDue(schedule({ nextRunAt }), 1_000_000)).toBe(true)
  })
})

describe('computeNextRunAt', () => {
  it('adds the real interval in milliseconds', () => {
    expect(computeNextRunAt(24, 0)).toBe(24 * 60 * 60 * 1000)
  })
})

describe('BackupScheduler', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'backup-scheduler-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('creates a real backup on start() when due and advances nextRunAt', async () => {
    const scheduleStore = new BackupScheduleStore(join(dir, 'schedule.json'))
    await scheduleStore.set(schedule({ nextRunAt: null }))
    const create = vi.fn().mockResolvedValue({ id: 'backup-1' })
    const scheduler = new BackupScheduler(scheduleStore, { create } as never, 60_000)

    scheduler.start()
    await vi.waitFor(() => expect(create).toHaveBeenCalledWith({ label: 'Scheduled backup' }))

    const updated = await scheduleStore.get()
    expect(updated.lastRunAt).not.toBeNull()
    expect(updated.nextRunAt).toBeGreaterThan(Date.now())
    scheduler.stop()
  })

  it('does nothing on start() when no backup is due', async () => {
    const scheduleStore = new BackupScheduleStore(join(dir, 'schedule.json'))
    await scheduleStore.set(schedule({ nextRunAt: Date.now() + 60 * 60 * 1000 }))
    const create = vi.fn()
    const scheduler = new BackupScheduler(scheduleStore, { create } as never, 60_000)

    scheduler.start()
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(create).not.toHaveBeenCalled()
    scheduler.stop()
  })

  it('stop() prevents the recurring timer from running a later check', async () => {
    vi.useFakeTimers()
    const scheduleStore = new BackupScheduleStore(join(dir, 'schedule.json'))
    await scheduleStore.set(schedule({ enabled: false }))
    const create = vi.fn()
    const scheduler = new BackupScheduler(scheduleStore, { create } as never, 1000)

    scheduler.start()
    scheduler.stop()
    await vi.advanceTimersByTimeAsync(5000)

    expect(create).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
