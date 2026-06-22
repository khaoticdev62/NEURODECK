import type { DisplaySettings } from '@shared/contracts/displaySettings'
import { JsonStore } from '../persistence/JsonStore'

const DEFAULT_SETTINGS: DisplaySettings = {
  reduceMotion: false,
  highContrast: false,
  textScale: 'normal'
}

/** Real, persisted ND-044 Display and Theme Settings — see the contract for why it's scoped to motion/contrast/text-scale. */
export class DisplaySettingsStore {
  private readonly store: JsonStore<DisplaySettings>

  constructor(filePath: string) {
    this.store = new JsonStore<DisplaySettings>(filePath, DEFAULT_SETTINGS)
  }

  async get(): Promise<DisplaySettings> {
    return this.store.read()
  }

  async set(settings: DisplaySettings): Promise<DisplaySettings> {
    await this.store.write(settings)
    return settings
  }
}
