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
    new LanShareGroupCodeStore(join(dir, 'group-code.json'), fakeCipher())
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

  it('reports a real error when the transfer port is already in use', async () => {
    const transferPort = await freePort()
    const authPort = await freePort()
    const blocker = createServer()
    await new Promise<void>((resolve) => blocker.listen(transferPort, resolve))

    try {
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
      expect(status.state).toBe('error')
      expect(status.reason).toContain('Failed to bind')
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()))
    }
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
