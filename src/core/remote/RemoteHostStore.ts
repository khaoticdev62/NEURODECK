import { randomUUID } from 'node:crypto'
import type { AddRemoteHostRequest, RemoteHost } from '@shared/contracts/remote'
import { JsonStore } from '../persistence/JsonStore'
import type { SecretCipher } from '../models/SecretCipher'

interface StoredHost {
  id: string
  name: string
  hostname: string
  port: number
  username: string
  authMethod: RemoteHost['authMethod']
  encryptedSecret: string | null
  privateKeyPath: string | null
  trustedFingerprint: string | null
  trustedAt: number | null
  createdAt: number
}

interface HostIndex {
  hosts: StoredHost[]
}

/**
 * Real SSH host registry (ND-040). Mirrors `ModelProviderStore`'s pattern:
 * the password/passphrase is encrypted with the injected `SecretCipher`
 * (real implementation: Electron `safeStorage`) before it ever touches
 * disk, and `list()`/`get()` never return it — only `getSecret()`, called
 * exclusively from `RemoteConnectionService` inside the main process,
 * decrypts it. `trustedFingerprint` implements trust-on-first-use: it
 * starts `null` and is set once, by `RemoteConnectionService`, on the
 * first successful connection — never accepted from the renderer directly.
 */
export class RemoteHostStore {
  private store: JsonStore<HostIndex>

  constructor(
    filePath: string,
    private cipher: SecretCipher
  ) {
    this.store = new JsonStore<HostIndex>(filePath, { hosts: [] })
  }

  async list(): Promise<RemoteHost[]> {
    const index = await this.store.read()
    return index.hosts.map(toPublicHost)
  }

  async add(request: AddRemoteHostRequest): Promise<RemoteHost> {
    let encryptedSecret: string | null = null
    if (request.secret) {
      if (!this.cipher.isAvailable()) {
        throw new Error(
          'Secure credential storage is not available on this system — cannot save this host.'
        )
      }
      encryptedSecret = this.cipher.encrypt(request.secret)
    }

    const host: StoredHost = {
      id: randomUUID(),
      name: request.name,
      hostname: request.hostname,
      port: request.port ?? 22,
      username: request.username,
      authMethod: request.authMethod,
      encryptedSecret,
      privateKeyPath: request.privateKeyPath ?? null,
      trustedFingerprint: null,
      trustedAt: null,
      createdAt: Date.now()
    }

    const index = await this.store.read()
    await this.store.write({ hosts: [...index.hosts, host] })
    return toPublicHost(host)
  }

  async remove(hostId: string): Promise<void> {
    const index = await this.store.read()
    await this.store.write({ hosts: index.hosts.filter((host) => host.id !== hostId) })
  }

  async get(hostId: string): Promise<RemoteHost | undefined> {
    const index = await this.store.read()
    const host = index.hosts.find((candidate) => candidate.id === hostId)
    return host ? toPublicHost(host) : undefined
  }

  /** Decrypts the real secret — only ever called from `RemoteConnectionService` inside the main process, never returned over IPC. */
  async getSecret(hostId: string): Promise<string | null> {
    const index = await this.store.read()
    const host = index.hosts.find((candidate) => candidate.id === hostId)
    if (!host?.encryptedSecret) return null
    return this.cipher.decrypt(host.encryptedSecret)
  }

  async getStoredHost(hostId: string): Promise<StoredHost | undefined> {
    const index = await this.store.read()
    return index.hosts.find((candidate) => candidate.id === hostId)
  }

  /** Records the host key fingerprint on a real successful connection (trust-on-first-use). Rejects overwriting an existing, different fingerprint — call sites must treat a mismatch as a hard failure, never silently re-trust. */
  async recordTrustedFingerprint(hostId: string, fingerprint: string): Promise<void> {
    const index = await this.store.read()
    const host = index.hosts.find((candidate) => candidate.id === hostId)
    if (!host) return
    host.trustedFingerprint = fingerprint
    host.trustedAt = Date.now()
    await this.store.write(index)
  }
}

function toPublicHost(host: StoredHost): RemoteHost {
  return {
    id: host.id,
    name: host.name,
    hostname: host.hostname,
    port: host.port,
    username: host.username,
    authMethod: host.authMethod,
    hasSecret: host.encryptedSecret !== null || host.privateKeyPath !== null,
    trustedFingerprint: host.trustedFingerprint,
    trustedAt: host.trustedAt,
    createdAt: host.createdAt
  }
}
