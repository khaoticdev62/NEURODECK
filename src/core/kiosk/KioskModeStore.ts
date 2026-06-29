import type { KioskModeSettings } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

const DEFAULT_SETTINGS: KioskModeSettings = {
  enabled: false,
  allowedRoutePaths: [],
  restrictSettings: true,
  startRoutePath: '/'
}

/**
 * Real Epic X14 Kiosk Mode persisted settings (supplemental spec
 * §46.2). Tiny by design, the same scope every other small settings
 * store in this codebase uses — real enforcement (route redirection,
 * PIN-gated exit reusing the existing Lock PIN) lives in the
 * renderer's `KioskModeProvider`.
 */
export class KioskModeStore {
  private readonly store: JsonStore<KioskModeSettings>

  constructor(filePath: string) {
    this.store = new JsonStore<KioskModeSettings>(filePath, DEFAULT_SETTINGS)
  }

  async get(): Promise<KioskModeSettings> {
    return this.store.read()
  }

  async set(settings: KioskModeSettings): Promise<KioskModeSettings> {
    await this.store.write(settings)
    return settings
  }
}
