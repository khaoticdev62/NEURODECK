import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { Client, type ClientChannel } from 'ssh2'
import type {
  RemoteConnectionTestResult,
  RemoteHost,
  RemoteSession,
  RemoteSessionDataEvent,
  RemoteSessionExitEvent
} from '@shared/contracts/remote'
import type { RemoteHostStore } from './RemoteHostStore'

const MAX_RUNNING_SESSIONS = 8
const MAX_OUTPUT_CHARS = 1024 * 1024
/** ssh2 hashes the host key for us when `hostHash` is set; this is the algorithm, not a homegrown digest. */
const HOST_HASH_ALGORITHM = 'sha256'

/** Dependency-injected so `RemoteConnectionService` is unit-testable without a live SSH daemon — the default factory is the real `ssh2.Client`. */
export type SshClientFactory = () => Client

interface SessionRecord {
  info: RemoteSession
  client: Client
  channel: ClientChannel | null
  output: string
  truncated: boolean
  sequence: number
}

export class RemoteConnectionError extends Error {
  constructor(
    readonly code:
      | 'HOST_NOT_FOUND'
      | 'NO_CREDENTIAL'
      | 'HOST_KEY_MISMATCH'
      | 'CONNECTION_FAILED'
      | 'SESSION_NOT_FOUND'
      | 'SESSION_EXITED'
      | 'SESSION_LIMIT',
    message: string
  ) {
    super(message)
  }
}

/**
 * Real SSH connectivity (ND-040/ND-041). Trust-on-first-use host-key
 * verification: a host's first successful connection records the real
 * server host-key fingerprint via `RemoteHostStore`; every later connection
 * to that host must present the *same* fingerprint or the connection is
 * rejected outright (`HOST_KEY_MISMATCH`) — this is the same protection
 * `ssh`/`known_hosts` gives you, implemented explicitly because Electron's
 * main process has no `~/.ssh/known_hosts` integration of its own.
 */
export class RemoteConnectionService {
  private readonly sessions = new Map<string, SessionRecord>()
  private readonly dataListeners = new Set<(event: RemoteSessionDataEvent) => void>()
  private readonly exitListeners = new Set<(event: RemoteSessionExitEvent) => void>()

  constructor(
    private hostStore: RemoteHostStore,
    private clientFactory: SshClientFactory = () => new Client()
  ) {}

  async testConnection(hostId: string): Promise<RemoteConnectionTestResult> {
    const host = await this.hostStore.get(hostId)
    if (!host)
      throw new RemoteConnectionError('HOST_NOT_FOUND', 'That remote host no longer exists.')

    const startedAt = Date.now()
    try {
      const { client, fingerprint, newlyTrusted } = await this.connect(host)
      client.end()
      return {
        hostId,
        reachable: true,
        latencyMs: Date.now() - startedAt,
        fingerprint,
        newlyTrusted,
        errorMessage: null
      }
    } catch (error) {
      return {
        hostId,
        reachable: false,
        latencyMs: null,
        fingerprint: null,
        newlyTrusted: false,
        errorMessage: error instanceof Error ? error.message : 'Connection failed.'
      }
    }
  }

  async createSession(hostId: string, cols: number, rows: number): Promise<RemoteSession> {
    const runningCount = [...this.sessions.values()].filter(
      (record) => record.info.status === 'running'
    ).length
    if (runningCount >= MAX_RUNNING_SESSIONS) {
      throw new RemoteConnectionError(
        'SESSION_LIMIT',
        `At most ${MAX_RUNNING_SESSIONS} remote sessions may run at once.`
      )
    }

    const host = await this.hostStore.get(hostId)
    if (!host)
      throw new RemoteConnectionError('HOST_NOT_FOUND', 'That remote host no longer exists.')

    const info: RemoteSession = {
      id: randomUUID(),
      hostId: host.id,
      hostLabel: `${host.username}@${host.hostname}`,
      cols,
      rows,
      createdAt: Date.now(),
      status: 'connecting',
      exitCode: null,
      errorMessage: null
    }
    const record: SessionRecord = {
      info,
      client: this.clientFactory(),
      channel: null,
      output: '',
      truncated: false,
      sequence: 0
    }
    this.sessions.set(info.id, record)

    try {
      const { client } = await this.connect(host, record.client)
      const channel = await openShell(client, cols, rows)
      record.channel = channel
      record.info = { ...record.info, status: 'running' }

      channel.on('data', (data: Buffer) => {
        this.appendOutput(record, data.toString('utf-8'))
      })
      channel.stderr?.on('data', (data: Buffer) => {
        this.appendOutput(record, data.toString('utf-8'))
      })
      channel.on('close', () => {
        record.info = { ...record.info, status: 'exited', exitCode: 0 }
        for (const listener of this.exitListeners) listener({ session: { ...record.info } })
        client.end()
      })
    } catch (error) {
      record.info = {
        ...record.info,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Connection failed.'
      }
      for (const listener of this.exitListeners) listener({ session: { ...record.info } })
    }

    return { ...record.info }
  }

  snapshot(sessionId: string): {
    session: RemoteSession
    output: string
    truncated: boolean
    lastSequence: number
  } {
    const record = this.requireSession(sessionId)
    return {
      session: { ...record.info },
      output: record.output,
      truncated: record.truncated,
      lastSequence: record.sequence
    }
  }

  write(sessionId: string, data: string): void {
    const record = this.requireRunningSession(sessionId)
    record.channel?.write(data)
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const record = this.requireRunningSession(sessionId)
    record.channel?.setWindow(rows, cols, 0, 0)
    record.info = { ...record.info, cols, rows }
  }

  terminate(sessionId: string): void {
    const record = this.requireRunningSession(sessionId)
    record.channel?.close()
    record.client.end()
  }

  onData(listener: (event: RemoteSessionDataEvent) => void): () => void {
    this.dataListeners.add(listener)
    return () => this.dataListeners.delete(listener)
  }

  onExit(listener: (event: RemoteSessionExitEvent) => void): () => void {
    this.exitListeners.add(listener)
    return () => this.exitListeners.delete(listener)
  }

  dispose(): void {
    for (const record of this.sessions.values()) {
      if (record.info.status === 'running') {
        record.channel?.close()
        record.client.end()
      }
    }
    this.sessions.clear()
    this.dataListeners.clear()
    this.exitListeners.clear()
  }

  private appendOutput(record: SessionRecord, data: string): void {
    record.sequence += 1
    record.output += data
    if (record.output.length > MAX_OUTPUT_CHARS) {
      record.output = record.output.slice(-MAX_OUTPUT_CHARS)
      record.truncated = true
    }
    const event = { sessionId: record.info.id, data, sequence: record.sequence }
    for (const listener of this.dataListeners) listener(event)
  }

  /** Connects and verifies the host key against `RemoteHostStore`'s trust-on-first-use record. */
  private async connect(
    host: RemoteHost,
    client: Client = this.clientFactory()
  ): Promise<{ client: Client; fingerprint: string; newlyTrusted: boolean }> {
    const secret = await this.hostStore.getSecret(host.id)
    const storedHost = await this.hostStore.getStoredHost(host.id)
    let privateKeyContents: Buffer | undefined
    if (host.authMethod === 'privateKey' && storedHost?.privateKeyPath) {
      privateKeyContents = await readFile(storedHost.privateKeyPath)
    }
    if (host.authMethod === 'password' && !secret) {
      throw new RemoteConnectionError('NO_CREDENTIAL', 'This host has no saved password.')
    }
    if (host.authMethod === 'privateKey' && !privateKeyContents) {
      throw new RemoteConnectionError('NO_CREDENTIAL', 'This host has no saved private key.')
    }

    let resolvedFingerprint = ''
    let resolvedNewlyTrusted = false

    await new Promise<void>((resolve, reject) => {
      let settled = false
      client.on('ready', () => {
        if (settled) return
        settled = true
        resolve()
      })
      client.on('error', (error: Error) => {
        if (settled) return
        settled = true
        reject(error)
      })
      client.connect({
        host: host.hostname,
        port: host.port,
        username: host.username,
        readyTimeout: 10_000,
        ...(host.authMethod === 'password' ? { password: secret ?? undefined } : {}),
        ...(host.authMethod === 'privateKey'
          ? { privateKey: privateKeyContents, passphrase: secret ?? undefined }
          : {}),
        hostHash: HOST_HASH_ALGORITHM,
        hostVerifier: (fingerprint: string) => {
          resolvedFingerprint = fingerprint
          if (!storedHost?.trustedFingerprint) {
            resolvedNewlyTrusted = true
            return true
          }
          return storedHost.trustedFingerprint === fingerprint
        }
      })
    }).catch((error) => {
      if (resolvedFingerprint && !resolvedNewlyTrusted && storedHost?.trustedFingerprint) {
        throw new RemoteConnectionError(
          'HOST_KEY_MISMATCH',
          `${host.name}'s host key does not match the one trusted on first connection. This could mean the host was reinstalled, or that the connection is being intercepted. Remove and re-add this host only if you are certain it is safe.`
        )
      }
      throw new RemoteConnectionError(
        'CONNECTION_FAILED',
        error instanceof Error ? error.message : 'Could not connect to the remote host.'
      )
    })

    if (resolvedNewlyTrusted) {
      await this.hostStore.recordTrustedFingerprint(host.id, resolvedFingerprint)
    }

    return { client, fingerprint: resolvedFingerprint, newlyTrusted: resolvedNewlyTrusted }
  }

  private requireSession(sessionId: string): SessionRecord {
    const record = this.sessions.get(sessionId)
    if (!record) throw new RemoteConnectionError('SESSION_NOT_FOUND', 'Remote session not found.')
    return record
  }

  private requireRunningSession(sessionId: string): SessionRecord {
    const record = this.requireSession(sessionId)
    if (record.info.status !== 'running') {
      throw new RemoteConnectionError('SESSION_EXITED', 'Remote session is not running.')
    }
    return record
  }
}

function openShell(client: Client, cols: number, rows: number): Promise<ClientChannel> {
  return new Promise((resolve, reject) => {
    client.shell({ cols, rows, term: 'xterm-256color' }, (error, channel) => {
      if (error) reject(error)
      else resolve(channel)
    })
  })
}
