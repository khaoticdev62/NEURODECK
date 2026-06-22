import type { ControllerSettings } from '@shared/contracts/controllerSettings'
import { JsonStore } from '../persistence/JsonStore'

const DEFAULT_SETTINGS: ControllerSettings = { hapticsIntensity: 'medium' }

/** Real, persisted ND-043 Controller Settings — currently just haptics intensity (see contract for why). */
export class ControllerSettingsStore {
  private readonly store: JsonStore<ControllerSettings>

  constructor(filePath: string) {
    this.store = new JsonStore<ControllerSettings>(filePath, DEFAULT_SETTINGS)
  }

  async get(): Promise<ControllerSettings> {
    return this.store.read()
  }

  async set(settings: ControllerSettings): Promise<ControllerSettings> {
    await this.store.write(settings)
    return settings
  }
}
