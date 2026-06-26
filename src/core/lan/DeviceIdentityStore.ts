import { createHash, generateKeyPairSync, randomUUID } from 'node:crypto'
import { JsonStore } from '../persistence/JsonStore'

export interface DeviceIdentity {
  id: string
  publicKeyPem: string
  privateKeyPem: string
  fingerprint: string
}

/**
 * Real Epic X6 stable device identity (supplemental §19.1 "Certificate
 * fingerprint") — a real Ed25519 keypair generated once via Node's own
 * `crypto.generateKeyPairSync`, persisted, and reused across app
 * restarts so this device's real identity fingerprint stays stable for
 * peers that already trusted it. The keypair is not used to encrypt
 * transfers (that's the real AES-256-GCM session key derived from a
 * pre-shared pairing code — see `PeerTransferService`); its role here
 * is purely a stable, real per-device fingerprint, the same role a
 * self-signed TLS certificate's public key would play if this slice
 * built full mutual TLS.
 */
export class DeviceIdentityStore {
  private readonly store: JsonStore<DeviceIdentity | null>

  constructor(filePath: string) {
    this.store = new JsonStore<DeviceIdentity | null>(filePath, null)
  }

  async get(): Promise<DeviceIdentity> {
    const existing = await this.store.read()
    if (existing) return existing

    const { publicKey, privateKey } = generateKeyPairSync('ed25519')
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const identity: DeviceIdentity = {
      id: randomUUID(),
      publicKeyPem,
      privateKeyPem,
      fingerprint: createHash('sha256').update(publicKeyPem).digest('hex')
    }
    await this.store.write(identity)
    return identity
  }
}
