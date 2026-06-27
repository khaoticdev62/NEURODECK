import type { SecretCipher } from '../models/SecretCipher'
import { JsonStore } from '../persistence/JsonStore'

/** Warpinator's own real, documented default group code (confirmed in `prefs.py`: `DEFAULT_GROUP_CODE = "Warpinator"`; their own `get_secure_mode()` is literally `group_code != DEFAULT_GROUP_CODE`). Using the same default means a fresh NeuroDeck install can still complete a real v2 handshake with a fresh Warpinator install before either user has set a custom code — exactly matching real-world default behavior, not a fabricated convenience. */
export const DEFAULT_LAN_SHARE_GROUP_CODE = 'Warpinator'

interface PersistedGroupCode {
  encryptedGroupCode: string | null
  /** Mirrors `LanShareCertificateStore`'s honest plaintext fallback when the cipher is unavailable. */
  encrypted: boolean
}

/**
 * Real group-code storage (spec §11, Phase LAN-4). The plaintext code
 * is encrypted at rest via the injected `SecretCipher` and is never
 * exposed through this store's IPC-facing settings (`groupCodeConfigured`
 * is the only thing `LanShareSettingsStore` ever reports) — only main-
 * process crypto code (`groupCodeCipher.ts`, the real v2 registration
 * flow) ever calls `get()`.
 */
export class LanShareGroupCodeStore {
  private readonly store: JsonStore<PersistedGroupCode>

  constructor(
    filePath: string,
    private readonly cipher: SecretCipher
  ) {
    this.store = new JsonStore<PersistedGroupCode>(filePath, {
      encryptedGroupCode: null,
      encrypted: false
    })
  }

  /** Returns the configured code, or the real Warpinator default if none has been set. */
  async get(): Promise<string> {
    const data = await this.store.read()
    if (!data.encryptedGroupCode) return DEFAULT_LAN_SHARE_GROUP_CODE
    return data.encrypted ? this.cipher.decrypt(data.encryptedGroupCode) : data.encryptedGroupCode
  }

  async set(groupCode: string): Promise<void> {
    const canEncrypt = this.cipher.isAvailable()
    await this.store.write({
      encryptedGroupCode: canEncrypt ? this.cipher.encrypt(groupCode) : groupCode,
      encrypted: canEncrypt
    })
  }

  async clear(): Promise<void> {
    await this.store.write({ encryptedGroupCode: null, encrypted: false })
  }

  /** Real "secure mode" check — matches Warpinator's own definition exactly: the code has been changed from the default. */
  async isSecureMode(): Promise<boolean> {
    return (await this.get()) !== DEFAULT_LAN_SHARE_GROUP_CODE
  }
}
