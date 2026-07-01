import type { DisplaySettings } from '@shared/contracts/displaySettings'
import { JsonStore } from '../persistence/JsonStore'

const DEFAULT_SETTINGS: DisplaySettings = {
  reduceMotion: false,
  highContrast: false,
  textScale: 'normal',
  accent: 'cyan',
  radiusStyle: 'sharp',
  density: 'comfortable',
  surfaceStyle: 'solid',
  focusStyle: 'ring'
}

/** Real, persisted ND-044 Display and Theme Settings — see the contract for the full field list and rationale. */
export class DisplaySettingsStore {
  private readonly store: JsonStore<DisplaySettings>

  constructor(filePath: string) {
    this.store = new JsonStore<DisplaySettings>(filePath, DEFAULT_SETTINGS)
  }

  async get(): Promise<DisplaySettings> {
    // A file persisted before the theme-builder fields (accent/radiusStyle/
    // density/surfaceStyle/focusStyle) existed parses successfully but is
    // missing those keys — merge over defaults so old settings files don't
    // silently produce an incomplete DisplaySettings object.
    return { ...DEFAULT_SETTINGS, ...(await this.store.read()) }
  }

  async set(settings: DisplaySettings): Promise<DisplaySettings> {
    await this.store.write(settings)
    return settings
  }
}
