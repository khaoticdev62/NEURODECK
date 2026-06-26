import type { MicrophonePermissionStatus } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

interface MicrophonePermissionIndex {
  granted: boolean | null
}

/**
 * Real Epic X5 microphone permission gate (supplemental §15.3
 * "Microphone permission" is the first real step of the voice command
 * pipeline). NeuroDeck's main window only ever loads its own bundled
 * UI — there is no third-party origin to scope permission by, unlike
 * Browser System's per-tab `BrowserPermissionStore` — so this is one
 * real, explicit yes/no the user grants once via Privacy settings,
 * persisted, and consulted by the real `setPermissionRequestHandler`
 * wired onto the main window's session before any `getUserMedia` call
 * is allowed to succeed. Fails closed: `null`/unset means
 * `not-determined`, never silently treated as granted.
 */
export class MicrophonePermissionStore {
  private readonly store: JsonStore<MicrophonePermissionIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<MicrophonePermissionIndex>(filePath, { granted: null })
  }

  async getStatus(): Promise<MicrophonePermissionStatus> {
    const index = await this.store.read()
    if (index.granted === true) return 'granted'
    if (index.granted === false) return 'denied'
    return 'not-determined'
  }

  async setGranted(granted: boolean): Promise<void> {
    await this.store.write({ granted })
  }

  async isGranted(): Promise<boolean> {
    return (await this.getStatus()) === 'granted'
  }
}
