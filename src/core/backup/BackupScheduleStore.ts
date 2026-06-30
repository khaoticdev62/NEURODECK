import type { BackupScheduleSettings } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

const DEFAULT_SETTINGS: BackupScheduleSettings = {
  enabled: false,
  intervalHours: 24,
  lastRunAt: null,
  nextRunAt: null
}

/** Real Epic X7 scheduled-backup settings persistence — see `backupSchedule.ts` for the honest scope this represents. */
export class BackupScheduleStore {
  private readonly store: JsonStore<BackupScheduleSettings>

  constructor(filePath: string) {
    this.store = new JsonStore<BackupScheduleSettings>(filePath, DEFAULT_SETTINGS)
  }

  async get(): Promise<BackupScheduleSettings> {
    return this.store.read()
  }

  async set(settings: BackupScheduleSettings): Promise<BackupScheduleSettings> {
    await this.store.write(settings)
    return settings
  }
}
