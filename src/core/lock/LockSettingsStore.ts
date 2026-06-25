import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { LockStatus } from '@shared/contracts/lock'
import { JsonStore } from '../persistence/JsonStore'

interface LockSettingsFile {
  /** `<saltHex>:<derivedKeyHex>` — never the raw PIN, never reversible. */
  pinHash: string | null
}

const DEFAULT_SETTINGS: LockSettingsFile = { pinHash: null }
const KEY_LENGTH = 64

export class LockPinMismatchError extends Error {
  constructor() {
    super('Current PIN is incorrect.')
  }
}

/**
 * Real ND-002 Lock Screen credential storage. Scoped to a single local PIN
 * (no multi-profile/account vault yet — see `shared/contracts/lock.ts`).
 * Stores only a salted `scrypt` hash, in the same JSON-file-backed pattern
 * `ControllerSettingsStore`/`DisplaySettingsStore` already use — never the
 * raw PIN, and never anything reversible.
 */
export class LockSettingsStore {
  private readonly store: JsonStore<LockSettingsFile>

  constructor(filePath: string) {
    this.store = new JsonStore<LockSettingsFile>(filePath, DEFAULT_SETTINGS)
  }

  async getStatus(): Promise<LockStatus> {
    const file = await this.store.read()
    return { enabled: file.pinHash !== null }
  }

  /** Sets the PIN for the first time, or changes it — `currentPin` is required and verified whenever a PIN already exists. */
  async setPin(newPin: string, currentPin?: string): Promise<LockStatus> {
    const file = await this.store.read()
    if (file.pinHash !== null) {
      if (!currentPin || !verify(file.pinHash, currentPin)) throw new LockPinMismatchError()
    }
    await this.store.write({ pinHash: hash(newPin) })
    return { enabled: true }
  }

  async removePin(currentPin: string): Promise<LockStatus> {
    const file = await this.store.read()
    if (file.pinHash === null) return { enabled: false }
    if (!verify(file.pinHash, currentPin)) throw new LockPinMismatchError()
    await this.store.write({ pinHash: null })
    return { enabled: false }
  }

  async verifyPin(pin: string): Promise<boolean> {
    const file = await this.store.read()
    if (file.pinHash === null) return false
    return verify(file.pinHash, pin)
  }
}

function hash(pin: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(pin, salt, KEY_LENGTH)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

function verify(stored: string, attempt: string): boolean {
  const [saltHex, derivedHex] = stored.split(':')
  if (!saltHex || !derivedHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(derivedHex, 'hex')
  const actual = scryptSync(attempt, salt, KEY_LENGTH)
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
