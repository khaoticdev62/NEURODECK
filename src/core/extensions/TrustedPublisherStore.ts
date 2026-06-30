import type { TrustedPublisherRecord } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'
import { fingerprintPublicKey } from './ManifestSignature'

interface TrustedPublisherIndex {
  publishers: Record<string, TrustedPublisherRecord>
}

const DEFAULT_INDEX: TrustedPublisherIndex = { publishers: {} }

/** Real Epic X15 trusted-publisher keystore persistence — see `trustedPublisher.ts` for the security rationale. */
export class TrustedPublisherStore {
  private readonly store: JsonStore<TrustedPublisherIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<TrustedPublisherIndex>(filePath, DEFAULT_INDEX)
  }

  async list(): Promise<TrustedPublisherRecord[]> {
    const index = await this.store.read()
    return Object.values(index.publishers)
  }

  async get(fingerprint: string): Promise<TrustedPublisherRecord | undefined> {
    const index = await this.store.read()
    return index.publishers[fingerprint]
  }

  async add(publicKeyPem: string, publisherName: string): Promise<TrustedPublisherRecord> {
    const fingerprint = fingerprintPublicKey(publicKeyPem)
    const index = await this.store.read()
    const record: TrustedPublisherRecord = {
      fingerprint,
      publicKeyPem,
      publisherName,
      addedAt: Date.now(),
      revoked: false
    }
    await this.store.write({ publishers: { ...index.publishers, [fingerprint]: record } })
    return record
  }

  async setRevoked(fingerprint: string, revoked: boolean): Promise<TrustedPublisherRecord> {
    const index = await this.store.read()
    const existing = index.publishers[fingerprint]
    if (!existing) throw new Error('That trusted publisher is not registered.')
    const updated: TrustedPublisherRecord = { ...existing, revoked }
    await this.store.write({ publishers: { ...index.publishers, [fingerprint]: updated } })
    return updated
  }
}
