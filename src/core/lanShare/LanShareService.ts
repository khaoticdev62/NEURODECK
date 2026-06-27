import { constants as fsConstants } from 'node:fs'
import { access, mkdir } from 'node:fs/promises'
import { createServer, type Server, type Socket } from 'node:net'
import type { LanShareHealth, LanShareServiceStatus } from '@shared/contracts'
import type { LanShareInterfaceManager } from './LanShareInterfaceManager'
import type { LanShareSettingsStore } from './LanShareSettingsStore'

/**
 * Phase LAN-2 service lifecycle (spec §5 "LAN Share Supervisor", §26
 * service state). `start()` genuinely binds two real TCP listening
 * sockets — the transfer port and the registration/auth port from
 * settings — so port-conflict and bind-permission failures are real,
 * detected facts, not assumptions. Connections are accepted and
 * immediately closed: no Warpinator-compatible protocol exists yet
 * (that begins in Phase LAN-3), so pretending to speak one here would
 * violate this project's no-mock-production-behavior rule. Auto-start
 * is deliberately never wired into app boot in this phase — spec §24
 * requires auto-start to be gated behind "secure mode" (a real group
 * code), which Phase LAN-4 has not built yet.
 */
export class LanShareService {
  private transferServer: Server | null = null
  private authServer: Server | null = null
  private status: LanShareServiceStatus = { state: 'stopped', reason: 'Not started.' }
  private listeners = new Set<(status: LanShareServiceStatus) => void>()

  constructor(
    private readonly settingsStore: LanShareSettingsStore,
    private readonly interfaceManager: LanShareInterfaceManager
  ) {}

  getStatus(): LanShareServiceStatus {
    return this.status
  }

  onChange(listener: (status: LanShareServiceStatus) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async start(): Promise<LanShareServiceStatus> {
    if (this.status.state === 'running' || this.status.state === 'starting') {
      return this.status
    }
    this.setStatus({ state: 'starting', reason: 'Binding real transfer and registration sockets.' })

    const settings = await this.settingsStore.get()
    try {
      this.transferServer = await this.listenOn(settings.transferPort)
      this.authServer = await this.listenOn(settings.authPort)
    } catch (error) {
      this.closeServers()
      const reason =
        error instanceof Error
          ? `Failed to bind a real listening socket: ${error.message}`
          : 'Failed to bind a real listening socket.'
      this.setStatus({ state: 'error', reason })
      return this.status
    }

    this.setStatus({
      state: 'running',
      reason: 'Transfer and registration sockets are bound and accepting connections.',
      startedAt: Date.now()
    })
    return this.status
  }

  async stop(): Promise<LanShareServiceStatus> {
    this.closeServers()
    this.setStatus({ state: 'stopped', reason: 'Stopped by request.' })
    return this.status
  }

  async getHealth(): Promise<LanShareHealth> {
    const settings = await this.settingsStore.get()
    return {
      serviceState: this.status.state,
      transferPortBound: this.transferServer?.listening ?? false,
      authPortBound: this.authServer?.listening ?? false,
      receiveDirectoryWritable: await this.checkReceiveDirectoryWritable(settings.receiveDirectory),
      interfaceCount: this.interfaceManager.list().length
    }
  }

  private async checkReceiveDirectoryWritable(directory: string): Promise<boolean> {
    try {
      await mkdir(directory, { recursive: true })
      await access(directory, fsConstants.W_OK)
      return true
    } catch {
      return false
    }
  }

  private listenOn(port: number): Promise<Server> {
    return new Promise((resolve, reject) => {
      const server = createServer((socket: Socket) => {
        socket.destroy()
      })
      const onError = (error: Error): void => reject(error)
      server.once('error', onError)
      server.listen(port, () => {
        server.removeListener('error', onError)
        resolve(server)
      })
    })
  }

  private closeServers(): void {
    this.transferServer?.close()
    this.authServer?.close()
    this.transferServer = null
    this.authServer = null
  }

  private setStatus(status: LanShareServiceStatus): void {
    this.status = status
    for (const listener of this.listeners) listener(status)
  }
}
