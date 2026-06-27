import type { LanShareSettings, UpdateLanShareSettingsRequest } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

const DEFAULT_TRANSFER_PORT = 42000
const DEFAULT_AUTH_PORT = 42001

function defaultSettings(deviceDisplayName: string, receiveDirectory: string): LanShareSettings {
  return {
    deviceDisplayName,
    transferPort: DEFAULT_TRANSFER_PORT,
    authPort: DEFAULT_AUTH_PORT,
    receiveDirectory,
    groupCodeConfigured: false,
    approvalPolicy: 'always-ask',
    backgroundPolicy: 'screen-only',
    compressionMode: 'auto',
    autoStartEnabled: false
  }
}

export class InvalidLanShareSettingsError extends Error {}

/**
 * Phase LAN-1 settings persistence (spec §27 `lan_share_settings`). Group
 * code plaintext never lives here — `groupCodeConfigured` is the only
 * trace of it this store ever sees; the real secret-storage path for the
 * code itself is built alongside real auth in Phase LAN-4.
 */
export class LanShareSettingsStore {
  private readonly store: JsonStore<LanShareSettings | null>

  constructor(
    filePath: string,
    private readonly deviceDisplayName: string,
    private readonly receiveDirectory: string
  ) {
    this.store = new JsonStore<LanShareSettings | null>(filePath, null)
  }

  async get(): Promise<LanShareSettings> {
    const existing = await this.store.read()
    if (existing) return existing
    const settings = defaultSettings(this.deviceDisplayName, this.receiveDirectory)
    await this.store.write(settings)
    return settings
  }

  async update(patch: UpdateLanShareSettingsRequest): Promise<LanShareSettings> {
    const current = await this.get()
    const next: LanShareSettings = { ...current, ...patch }
    if (next.transferPort === next.authPort) {
      throw new InvalidLanShareSettingsError(
        'The transfer port and registration/auth port must be different.'
      )
    }
    // Real spec §11 default/insecure-mode policy: a default (unconfigured)
    // group code must always require incoming approval and never
    // auto-start unattended. This is enforced on the resulting state, so
    // a combined update that sets the group code and enables these in
    // the same call is still correctly evaluated.
    if (!next.groupCodeConfigured) {
      if (next.approvalPolicy === 'auto-accept-trusted') {
        throw new InvalidLanShareSettingsError(
          'Auto-accept requires a real, non-default group code (secure mode) — set one first.'
        )
      }
      if (next.autoStartEnabled) {
        throw new InvalidLanShareSettingsError(
          'Auto-start requires a real, non-default group code (secure mode) — set one first.'
        )
      }
    }
    await this.store.write(next)
    return next
  }

  async markGroupCodeConfigured(configured: boolean): Promise<LanShareSettings> {
    return this.update({ groupCodeConfigured: configured })
  }
}
