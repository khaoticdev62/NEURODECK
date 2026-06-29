import type { PresentationModeSettings } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

const DEFAULT_SETTINGS: PresentationModeSettings = { enabled: false, keepScreenAwake: true }

/**
 * Real Epic X14 Presentation Mode persisted toggle (supplemental
 * spec §46.1). Deliberately tiny — the actual presentation-mode
 * *behavior* (text scale, notification muting, screen-awake) lives in
 * the real existing systems each of those already has; this store
 * only remembers whether the mode is on and whether keep-awake is
 * wanted, the same scope `LockSettingsStore`/`DisplaySettingsStore`
 * already use for a single small settings object.
 */
export class PresentationModeStore {
  private readonly store: JsonStore<PresentationModeSettings>

  constructor(filePath: string) {
    this.store = new JsonStore<PresentationModeSettings>(filePath, DEFAULT_SETTINGS)
  }

  async get(): Promise<PresentationModeSettings> {
    return this.store.read()
  }

  async set(settings: PresentationModeSettings): Promise<PresentationModeSettings> {
    await this.store.write(settings)
    return settings
  }
}
