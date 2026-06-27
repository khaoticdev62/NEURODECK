import { createHash } from 'node:crypto'
import { generate } from 'selfsigned'
import type { SecretCipher } from '../models/SecretCipher'
import { JsonStore } from '../persistence/JsonStore'
import type { LanShareInterfaceManager } from './LanShareInterfaceManager'

/** Matches Warpinator's own real cert lifetime (`EXPIRE_TIME = 30 * day`, confirmed in `auth.py`). */
const CERT_VALIDITY_DAYS = 30

interface PersistedCertificate {
  hostname: string
  certificatePem: string
  privateKeyPem: string
  /** `true` when `privateKeyPem` is real ciphertext; `false` is the same honest plaintext fallback `ClipboardStore`/`ModelProviderStore` use when the cipher reports itself unavailable. */
  encrypted: boolean
  fingerprint: string
  notAfter: number
  createdAt: number
}

export interface LanShareCertificate {
  hostname: string
  certificatePem: string
  privateKeyPem: string
  /** Real SHA-256 hex digest of the PEM certificate text — used for spec §12 fingerprint-change trust detection. */
  fingerprint: string
  notAfter: number
}

/**
 * Real RSA-2048 self-signed X.509 certificate generation (spec §13,
 * Phase LAN-4) — deliberately deferred from Phase LAN-1's identity
 * store until this real consumer (v2 registration) existed. Mirrors
 * the real structure Warpinator's own `auth.py` builds: RSA-2048,
 * SHA-256 signature, subject/issuer common name set to the hostname,
 * SubjectAltName listing this device's real IP addresses, and a
 * 30-day validity window — confirmed by reading their real source
 * (audited in docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md), not
 * copied from it (X.509 field semantics aren't protected expression;
 * generation here goes through `selfsigned`, an independent MIT
 * library, not their `cryptography`-based code). The private key is
 * encrypted at rest via the same injected `SecretCipher` boundary
 * every other secret in this codebase uses.
 */
export class LanShareCertificateStore {
  private readonly store: JsonStore<PersistedCertificate | null>

  constructor(
    filePath: string,
    private readonly cipher: SecretCipher,
    private readonly interfaceManager: LanShareInterfaceManager
  ) {
    this.store = new JsonStore<PersistedCertificate | null>(filePath, null)
  }

  async get(hostname: string): Promise<LanShareCertificate> {
    const existing = await this.store.read()
    if (existing && existing.hostname === hostname && existing.notAfter > Date.now()) {
      return this.decode(existing)
    }
    return this.regenerate(hostname)
  }

  async regenerate(hostname: string): Promise<LanShareCertificate> {
    const altNames = this.interfaceManager
      .list()
      .map((iface) => ({ type: 7 as const, ip: iface.address }))
    const notBeforeDate = new Date()
    const notAfterDate = new Date(
      notBeforeDate.getTime() + CERT_VALIDITY_DAYS * 24 * 60 * 60 * 1000
    )

    const result = await generate([{ name: 'commonName', value: hostname }], {
      keySize: 2048,
      algorithm: 'sha256',
      notBeforeDate,
      notAfterDate,
      extensions: altNames.length > 0 ? [{ name: 'subjectAltName', altNames }] : undefined
    })

    const fingerprint = createHash('sha256').update(result.cert).digest('hex')
    const canEncrypt = this.cipher.isAvailable()
    const persisted: PersistedCertificate = {
      hostname,
      certificatePem: result.cert,
      privateKeyPem: canEncrypt ? this.cipher.encrypt(result.private) : result.private,
      encrypted: canEncrypt,
      fingerprint,
      notAfter: notAfterDate.getTime(),
      createdAt: Date.now()
    }
    await this.store.write(persisted)
    return this.decode(persisted)
  }

  private decode(persisted: PersistedCertificate): LanShareCertificate {
    return {
      hostname: persisted.hostname,
      certificatePem: persisted.certificatePem,
      privateKeyPem: persisted.encrypted
        ? this.cipher.decrypt(persisted.privateKeyPem)
        : persisted.privateKeyPem,
      fingerprint: persisted.fingerprint,
      notAfter: persisted.notAfter
    }
  }
}
