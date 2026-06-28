import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SecretCipher } from '../../models/SecretCipher'
import { LanShareCertificateStore } from '../LanShareCertificateStore'
import { LanShareGroupCodeStore } from '../LanShareGroupCodeStore'
import { LanShareIdentityStore } from '../LanShareIdentityStore'
import { LanShareInterfaceManager } from '../LanShareInterfaceManager'
import { LanSharePeerStore } from '../LanSharePeerStore'
import { LanShareService } from '../LanShareService'
import { LanShareSettingsStore } from '../LanShareSettingsStore'
import { LanShareTransferStore } from '../LanShareTransferStore'

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      const port = typeof address === 'object' && address ? address.port : 0
      probe.close(() => resolve(port))
    })
  })
}

function fakeCipher(): SecretCipher {
  return {
    isAvailable: () => true,
    encrypt: (plaintext) => `ENC(${plaintext})`,
    decrypt: (ciphertext) => ciphertext.replace(/^ENC\(/, '').replace(/\)$/, '')
  }
}

function createService(
  dir: string,
  settingsStore: LanShareSettingsStore,
  identityStore: LanShareIdentityStore,
  peerStore: LanSharePeerStore
): LanShareService {
  const interfaceManager = new LanShareInterfaceManager()
  return new LanShareService(
    settingsStore,
    interfaceManager,
    identityStore,
    peerStore,
    new LanShareCertificateStore(join(dir, 'certificate.json'), fakeCipher(), interfaceManager),
    new LanShareGroupCodeStore(join(dir, 'group-code.json'), fakeCipher()),
    new LanShareTransferStore(join(dir, 'transfer-jobs.json'))
  )
}

describe('LanShareService', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lan-share-service-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('binds real listening sockets on start and reports running', async () => {
    const transferPort = await freePort()
    const authPort = await freePort()
    const settingsStore = new LanShareSettingsStore(
      join(dir, 'settings.json'),
      'Test Device',
      join(dir, 'receive')
    )
    await settingsStore.update({ transferPort, authPort })
    const identityStore = new LanShareIdentityStore(join(dir, 'identity.json'), 'Test Device')
    const peerStore = new LanSharePeerStore(join(dir, 'peers.json'))
    const service = createService(dir, settingsStore, identityStore, peerStore)

    const status = await service.start()
    expect(status.state).toBe('running')

    const health = await service.getHealth()
    expect(health.transferPortBound).toBe(true)
    expect(health.authPortBound).toBe(true)
    expect(health.receiveDirectoryWritable).toBe(true)

    await service.stop()
    expect(service.getStatus().state).toBe('stopped')
  })

  it('reports a real error when the transfer port cannot be bound', async () => {
    const authPort = await freePort()
    const settingsStore = new LanShareSettingsStore(
      join(dir, 'settings.json'),
      'Test Device',
      join(dir, 'receive')
    )
    // A real, deterministic, platform-independent bind failure: a port
    // number outside the valid 0-65535 range. A real port-in-use
    // conflict was tried first, but grpc-js's own `bindAsync` accepts
    // address reuse in a way that made a same-port raw `net.Server`
    // conflict platform-dependent (it did not reliably fail on
    // Windows) — confirmed directly against the real grpc-js binding
    // behavior rather than assumed.
    await settingsStore.update({ transferPort: 99999, authPort })
    const identityStore = new LanShareIdentityStore(join(dir, 'identity.json'), 'Test Device')
    const peerStore = new LanSharePeerStore(join(dir, 'peers.json'))
    const service = createService(dir, settingsStore, identityStore, peerStore)

    const status = await service.start()
    expect(status.state).toBe('error')
    expect(status.reason).toContain('Failed to bind')
  })

  it('notifies listeners on every real status transition', async () => {
    const transferPort = await freePort()
    const authPort = await freePort()
    const settingsStore = new LanShareSettingsStore(
      join(dir, 'settings.json'),
      'Test Device',
      join(dir, 'receive')
    )
    await settingsStore.update({ transferPort, authPort })
    const identityStore = new LanShareIdentityStore(join(dir, 'identity.json'), 'Test Device')
    const peerStore = new LanSharePeerStore(join(dir, 'peers.json'))
    const service = createService(dir, settingsStore, identityStore, peerStore)

    const seenStates: string[] = []
    service.onChange((status) => seenStates.push(status.state))

    await service.start()
    await service.stop()

    expect(seenStates).toEqual(['starting', 'running', 'stopped'])
  })
})
