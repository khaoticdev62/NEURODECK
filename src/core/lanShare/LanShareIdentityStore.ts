import { randomUUID } from 'node:crypto'
import type { LanShareIdentity } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

/**
 * Phase LAN-1 identity record — a stable per-device id and display name
 * only. The real RSA keypair + self-signed X.509 certificate the
 * Warpinator-compatible auth flow needs (spec §13) is deliberately not
 * generated here: certificate generation belongs to Phase LAN-4
 * ("auth, group code, trust"), not the LAN-1 schema/data-model phase.
 * Building it now would be a real crypto mechanism with no consumer yet.
 */
export class LanShareIdentityStore {
  private readonly store: JsonStore<LanShareIdentity | null>

  constructor(
    filePath: string,
    private readonly defaultDisplayName: string
  ) {
    this.store = new JsonStore<LanShareIdentity | null>(filePath, null)
  }

  async get(): Promise<LanShareIdentity> {
    const existing = await this.store.read()
    if (existing) return existing
    const identity: LanShareIdentity = {
      id: randomUUID(),
      displayName: this.defaultDisplayName,
      createdAt: Date.now()
    }
    await this.store.write(identity)
    return identity
  }

  async setDisplayName(displayName: string): Promise<LanShareIdentity> {
    const current = await this.get()
    const updated: LanShareIdentity = { ...current, displayName }
    await this.store.write(updated)
    return updated
  }
}
