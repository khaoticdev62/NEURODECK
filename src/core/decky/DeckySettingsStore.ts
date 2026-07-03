import type { DeckySettings } from '@shared/contracts/decky'
import { JsonStore } from '../persistence/JsonStore'

const DEFAULT_SETTINGS: DeckySettings = { enabled: false }

/** Real, persisted Phase 4 Decky Loader bridge settings — off by default, mirroring `DisplaySettingsStore`'s single-file JsonStore shape exactly. */
export class DeckySettingsStore {
  private readonly store: JsonStore<DeckySettings>

  constructor(filePath: string) {
    this.store = new JsonStore<DeckySettings>(filePath, DEFAULT_SETTINGS)
  }

  async get(): Promise<DeckySettings> {
    return { ...DEFAULT_SETTINGS, ...(await this.store.read()) }
  }

  async set(settings: DeckySettings): Promise<DeckySettings> {
    await this.store.write(settings)
    return settings
  }
}
