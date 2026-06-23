import { EventEmitter } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Client, ClientChannel, ConnectConfig } from 'ssh2'
import { RemoteHostStore } from '../RemoteHostStore'
import { RemoteConnectionService } from '../RemoteConnectionService'
import type { SecretCipher } from '../../models/SecretCipher'

const directories: string[] = []

afterEach(async () =>
  Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
)

describe('RemoteConnectionService', () => {
  it('records a host key on first connection and rejects later mismatches', async () => {
    const store = await createStore()
    const host = await store.add({
      name: 'Lab box',
      hostname: 'lab.local',
      port: 22,
      username: 'deck',
      authMethod: 'password',
      secret: 'secret'
    })
    const fingerprints = ['SHA256:first', 'SHA256:changed']
    const service = new RemoteConnectionService(store, () => {
      return new FakeSshClient(fingerprints.shift() ?? 'SHA256:changed') as unknown as Client
    })

    const first = await service.testConnection(host.id)
    const trusted = await store.get(host.id)
    const second = await service.testConnection(host.id)

    expect(first).toMatchObject({
      reachable: true,
      fingerprint: 'SHA256:first',
      newlyTrusted: true
    })
    expect(trusted?.trustedFingerprint).toBe('SHA256:first')
    expect(second.reachable).toBe(false)
    expect(second.errorMessage).toContain('host key does not match')
  })

  it('opens a real bounded session abstraction over the injected SSH client', async () => {
    const store = await createStore()
    const host = await store.add({
      name: 'Build runner',
      hostname: 'runner.local',
      port: 22,
      username: 'deck',
      authMethod: 'password',
      secret: 'secret'
    })
    const client = new FakeSshClient('SHA256:runner')
    const service = new RemoteConnectionService(store, () => client as unknown as Client)
    const dataEvents: unknown[] = []
    const exitEvents: unknown[] = []
    service.onData((event) => dataEvents.push(event))
    service.onExit((event) => exitEvents.push(event))

    const session = await service.createSession(host.id, 100, 30)
    client.channel.emitData('hello remote\n')
    service.write(session.id, 'pwd\n')
    service.resize(session.id, 120, 40)
    const snapshot = service.snapshot(session.id)
    service.terminate(session.id)

    expect(session.status).toBe('running')
    expect(client.channel.writes).toEqual(['pwd\n'])
    expect(client.channel.window).toEqual({ rows: 40, cols: 120 })
    expect(snapshot.output).toBe('hello remote\n')
    expect(snapshot.lastSequence).toBe(1)
    expect(dataEvents).toHaveLength(1)
    expect(exitEvents).toHaveLength(1)
  })
})

async function createStore(): Promise<RemoteHostStore> {
  const directory = await mkdtemp(join(tmpdir(), 'ndx-remote-connection-'))
  directories.push(directory)
  return new RemoteHostStore(join(directory, 'remote-hosts.json'), reversibleCipher)
}

class FakeSshClient extends EventEmitter {
  readonly channel = new FakeChannel()
  ended = false

  constructor(private readonly fingerprint: string) {
    super()
  }

  connect(config: ConnectConfig): void {
    const hostVerifier = config.hostVerifier as ((fingerprint: string) => boolean) | undefined
    const allowed = hostVerifier?.(this.fingerprint)
    queueMicrotask(() => {
      if (allowed === false) this.emit('error', new Error('Host key rejected.'))
      else this.emit('ready')
    })
  }

  shell(
    _options: { cols: number; rows: number; term: string },
    callback: (error: Error | undefined, channel: ClientChannel) => void
  ): void {
    callback(undefined, this.channel as unknown as ClientChannel)
  }

  end(): void {
    this.ended = true
  }
}

class FakeChannel extends EventEmitter {
  readonly stderr = new EventEmitter()
  writes: string[] = []
  window = { rows: 30, cols: 100 }

  write(data: string): void {
    this.writes.push(data)
  }

  setWindow(rows: number, cols: number): void {
    this.window = { rows, cols }
  }

  close(): void {
    this.emit('close')
  }

  emitData(data: string): void {
    this.emit('data', Buffer.from(data, 'utf-8'))
  }
}

const reversibleCipher: SecretCipher = {
  isAvailable: () => true,
  encrypt: (plaintext) => `encrypted:${plaintext}`,
  decrypt: (ciphertext) => ciphertext.replace(/^encrypted:/, '')
}
