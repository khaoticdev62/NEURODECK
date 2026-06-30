import type { BackupScheduleSettings } from '@shared/contracts'
import type { BackupService } from './BackupService'
import type { BackupScheduleStore } from './BackupScheduleStore'

/** Pure scheduling decision — extracted so it's testable without timers or real file I/O. */
export function isBackupDue(schedule: BackupScheduleSettings, now: number): boolean {
  if (!schedule.enabled) return false
  if (schedule.nextRunAt === null) return true
  return now >= schedule.nextRunAt
}

export function computeNextRunAt(intervalHours: number, from: number): number {
  return from + intervalHours * 60 * 60 * 1000
}

const DEFAULT_CHECK_INTERVAL_MS = 15 * 60 * 1000

/**
 * Real Epic X7 scheduled backup runner (supplemental §21.1's named
 * gap). There is no real OS-level cron/launchd integration in this
 * codebase, so this checks-and-catches-up on a recurring in-process
 * timer rather than firing at an exact wall-clock instant — honest
 * for an app that is not always running. A backup that was due while
 * the app was closed runs as soon as the app is next open, rather
 * than being silently skipped.
 */
export class BackupScheduler {
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly scheduleStore: BackupScheduleStore,
    private readonly backupService: BackupService,
    private readonly checkIntervalMs: number = DEFAULT_CHECK_INTERVAL_MS
  ) {}

  start(): void {
    void this.checkAndRun()
    this.timer = setInterval(() => void this.checkAndRun(), this.checkIntervalMs)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private async checkAndRun(): Promise<void> {
    const schedule = await this.scheduleStore.get()
    const now = Date.now()
    if (!isBackupDue(schedule, now)) return
    await this.backupService.create({ label: 'Scheduled backup' })
    await this.scheduleStore.set({
      ...schedule,
      lastRunAt: now,
      nextRunAt: computeNextRunAt(schedule.intervalHours, now)
    })
  }
}
