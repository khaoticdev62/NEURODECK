import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
): { service: LanShareService; transferStore: LanShareTransferStore } {
  const interfaceManager = new LanShareInterfaceManager()
  const transferStore = new LanShareTransferStore(join(dir, 'transfer-jobs.json'))
  const service = new LanShareService(
    settingsStore,
    interfaceManager,
    identityStore,
    peerStore,
    new LanShareCertificateStore(join(dir, 'certificate.json'), fakeCipher(), interfaceManager),
    new LanShareGroupCodeStore(join(dir, 'group-code.json'), fakeCipher()),
    transferStore
  )
  return { service, transferStore }
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
    const { service } = createService(dir, settingsStore, identityStore, peerStore)

    const status = await service.start()
    expect(status.state).toBe('running')

    const health = await service.getHealth()
    expect(health.transferPortBound).toBe(true)
    expect(health.authPortBound).toBe(true)
    expect(health.receiveDirectoryWritable).toBe(true)

    await service.stop()
    expect(service.getStatus().state).toBe('stopped')
  })

  it('stops on a real suspend signal and rebinds real sockets again on resume', async () => {
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
    const { service } = createService(dir, settingsStore, identityStore, peerStore)

    await service.start()
    expect(service.getStatus().state).toBe('running')

    await service.handleSystemSuspend()
    expect(service.getStatus().state).toBe('stopped')
    let health = await service.getHealth()
    expect(health.transferPortBound).toBe(false)

    await service.handleSystemResume()
    expect(service.getStatus().state).toBe('running')
    health = await service.getHealth()
    expect(health.transferPortBound).toBe(true)

    await service.stop()
  })

  it('stays stopped on resume if it was already manually stopped before suspend', async () => {
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
    const { service } = createService(dir, settingsStore, identityStore, peerStore)

    await service.start()
    await service.stop()
    expect(service.getStatus().state).toBe('stopped')

    await service.handleSystemSuspend()
    await service.handleSystemResume()

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
    const { service } = createService(dir, settingsStore, identityStore, peerStore)

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
    const { service } = createService(dir, settingsStore, identityStore, peerStore)

    const seenStates: string[] = []
    service.onChange((status) => seenStates.push(status.state))

    await service.start()
    await service.stop()

    expect(seenStates).toEqual(['starting', 'running', 'stopped'])
  })

  it('sends a real file end-to-end between two real services and commits it at the receiver', async () => {
    const senderDir = join(dir, 'sender')
    const receiverDir = join(dir, 'receiver')

    const senderTransferPort = await freePort()
    const senderAuthPort = await freePort()
    const senderSettings = new LanShareSettingsStore(
      join(senderDir, 'settings.json'),
      'Sender Device',
      join(senderDir, 'receive')
    )
    await senderSettings.update({ transferPort: senderTransferPort, authPort: senderAuthPort })
    const senderIdentity = new LanShareIdentityStore(
      join(senderDir, 'identity.json'),
      'Sender Device'
    )
    const senderPeers = new LanSharePeerStore(join(senderDir, 'peers.json'))
    const { service: senderService } = createService(
      senderDir,
      senderSettings,
      senderIdentity,
      senderPeers
    )

    const receiverTransferPort = await freePort()
    const receiverAuthPort = await freePort()
    const receiveDirectory = join(receiverDir, 'received')
    const receiverSettings = new LanShareSettingsStore(
      join(receiverDir, 'settings.json'),
      'Receiver Device',
      receiveDirectory
    )
    await receiverSettings.update({
      transferPort: receiverTransferPort,
      authPort: receiverAuthPort
    })
    const receiverIdentity = new LanShareIdentityStore(
      join(receiverDir, 'identity.json'),
      'Receiver Device'
    )
    const receiverPeers = new LanSharePeerStore(join(receiverDir, 'peers.json'))
    const { service: receiverService, transferStore: receiverTransferStore } = createService(
      receiverDir,
      receiverSettings,
      receiverIdentity,
      receiverPeers
    )

    await senderService.start()
    await receiverService.start()

    try {
      const receiverPeer = await senderPeers.addManual({
        address: '127.0.0.1',
        transferPort: receiverTransferPort,
        authPort: receiverAuthPort
      })
      await receiverPeers.addManual({
        address: '127.0.0.1',
        transferPort: senderTransferPort,
        authPort: senderAuthPort
      })

      const sourceFile = join(senderDir, 'source.txt')
      const content = 'a real file sent end-to-end through two real LanShareService instances\n'
      await writeFile(sourceFile, content, 'utf-8')

      const sentJob = await senderService.sendFiles(receiverPeer.id, [sourceFile])
      expect(sentJob.status).toBe('queued')

      let receivedJobId: string | undefined
      await vi.waitFor(
        async () => {
          const jobs = await receiverTransferStore.list()
          const pending = jobs.find((job) => job.status === 'waiting-for-approval')
          expect(pending).toBeDefined()
          receivedJobId = pending?.id
        },
        { timeout: 10000 }
      )

      const completedJob = await receiverService.acceptIncomingTransfer(receivedJobId as string)
      if (completedJob.status !== 'completed') {
        throw new Error(`Job failed: ${completedJob.errorMessage}`)
      }
      expect(completedJob.status).toBe('completed')

      const finalContent = await readFile(join(receiveDirectory, 'source.txt'), 'utf-8')
      expect(finalContent).toBe(content)
    } finally {
      await senderService.stop()
      await receiverService.stop()
    }
  }, 20000)
})
