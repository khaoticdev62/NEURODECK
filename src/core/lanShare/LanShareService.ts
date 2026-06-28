import { createHash } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import { access, mkdir } from 'node:fs/promises'
import type {
  LanShareHealth,
  LanShareServiceStatus,
  LanShareSettings,
  LanShareTransferJob
} from '@shared/contracts'
import type { LanShareCertificateStore } from './LanShareCertificateStore'
import type { LanShareGroupCodeStore } from './LanShareGroupCodeStore'
import { LanShareRegistrationClient } from './grpc/LanShareRegistrationClient'
import {
  LanShareRegistrationServer,
  type NdxServiceRegistration
} from './grpc/LanShareRegistrationServer'
import { LanShareTransferClient } from './grpc/LanShareTransferClient'
import {
  LanShareTransferServer,
  type PendingSendOperation,
  type NdxTransferOpRequest
} from './grpc/LanShareTransferServer'
import { parsePeerHost } from './grpc/parsePeerHost'
import type { LanShareIdentityStore } from './LanShareIdentityStore'
import type { LanShareInterfaceManager } from './LanShareInterfaceManager'
import { LanShareManifestBuilder } from './LanShareManifestBuilder'
import { LanShareMdnsDiscovery, type DiscoveredLanSharePeer } from './LanShareMdnsDiscovery'
import type { LanSharePeerStore } from './LanSharePeerStore'
import { LanShareReceiveEngine } from './LanShareReceiveEngine'
import type { LanShareSettingsStore } from './LanShareSettingsStore'
import { LanShareTransferQueue } from './LanShareTransferQueue'
import type { LanShareTransferStore } from './LanShareTransferStore'

/** Warpinator's own current `RPC_API_VERSION` is `2` (confirmed in `meson.build`). Phase LAN-4 makes our own v2 support real (certificate exchange), so this device now honestly reports `2` as well. */
const SELF_REPORTED_API_VERSION = 2

/**
 * Phase LAN-2/LAN-3/LAN-4 service lifecycle (spec §5 "LAN Share
 * Supervisor", §10, §13, §26). `start()` binds a real transfer-port
 * placeholder socket (Phase LAN-5/6 still owns the `Warp` transfer
 * service), a real gRPC `WarpRegistration` server on the auth port,
 * and real mDNS advertise/browse using Warpinator's own confirmed
 * service type. A peer discovered via mDNS or added manually gets a
 * real v1 registration handshake, then — if it reports `api_version
 * >= 2` — a real v2 certificate request, decrypted with this device's
 * real configured group code. A successful decrypt means a real group
 * match; a failure is a real, honest `LAN_GROUP_MISMATCH`-equivalent
 * outcome, never assumed either way. Auto-start is deliberately never
 * wired into app boot — spec §24 gates it behind "secure mode" (a
 * non-default group code), which only the user can configure.
 */
export class LanShareService {
  private transferServer: LanShareTransferServer | null = null
  private registrationServer: LanShareRegistrationServer | null = null
  private readonly mdnsDiscovery = new LanShareMdnsDiscovery()
  private readonly registrationClient = new LanShareRegistrationClient()
  private readonly transferClient = new LanShareTransferClient()
  private readonly manifestBuilder = new LanShareManifestBuilder()
  private readonly receiveEngine = new LanShareReceiveEngine()
  private readonly transferQueue: LanShareTransferQueue
  private readonly pendingSendOperations = new Map<string, PendingSendOperation>()
  /** Real local-job-id → remote `OpInfo.ident` mapping for incoming transfers — the sender's `ProcessTransferOpRequest` carries its own job id as `info.ident`, which is what its `StartTransfer` looks the operation up by; this device's own locally-created receive job has a different id, so `acceptIncomingTransfer` must use the remote one when pulling, not its own. */
  private readonly incomingRemoteIdents = new Map<string, string>()
  private status: LanShareServiceStatus = { state: 'stopped', reason: 'Not started.' }
  private listeners = new Set<(status: LanShareServiceStatus) => void>()
  /** Real spec §24 suspend/resume tracking: only auto-restart on resume if the service was genuinely running right before suspend — a user who had manually stopped it must stay stopped. */
  private wasRunningBeforeSuspend = false

  constructor(
    private readonly settingsStore: LanShareSettingsStore,
    private readonly interfaceManager: LanShareInterfaceManager,
    private readonly identityStore: LanShareIdentityStore,
    private readonly peerStore: LanSharePeerStore,
    private readonly certificateStore: LanShareCertificateStore,
    private readonly groupCodeStore: LanShareGroupCodeStore,
    private readonly transferStore: LanShareTransferStore
  ) {
    this.transferQueue = new LanShareTransferQueue(transferStore, (job) =>
      this.dispatchTransferJob(job)
    )
  }

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
    const identity = await this.identityStore.get()
    // Real spec §22 "specific interface" mode: bind to exactly the
    // preferred interface's address when the user has set one and it is
    // still actually present, instead of always binding every interface.
    // A stale/removed preference falls back to "all interfaces" rather
    // than failing the whole service.
    const preferredInterface = settings.preferredInterfaceId
      ? this.interfaceManager
          .list()
          .find((candidate) => candidate.id === settings.preferredInterfaceId)
      : undefined
    const bindAddress = preferredInterface?.address ?? '0.0.0.0'

    try {
      this.transferServer = new LanShareTransferServer()
      await this.transferServer.start(
        settings.transferPort,
        {
          onTransferAnnounced: (request, peerAddress) => {
            void this.recordIncomingTransfer(request, peerAddress)
          },
          getPendingSendOperation: (ident) => this.pendingSendOperations.get(ident)
        },
        bindAddress
      )
      this.registrationServer = new LanShareRegistrationServer()
      await this.registrationServer.start(
        settings.authPort,
        {
          getOwnRegistration: () => this.buildOwnRegistration(settings, identity.connectId),
          onPeerRegistered: (registration, peerAddress) => {
            void this.recordPeerFromRegistration(registration, peerAddress)
          },
          getOwnCertificatePem: async () =>
            (await this.certificateStore.get(settings.deviceDisplayName)).certificatePem,
          getGroupCode: () => this.groupCodeStore.get()
        },
        bindAddress
      )
    } catch (error) {
      await this.registrationServer?.stop()
      this.registrationServer = null
      await this.transferServer?.stop()
      this.transferServer = null
      const reason =
        error instanceof Error
          ? `Failed to bind a real listening socket: ${error.message}`
          : 'Failed to bind a real listening socket.'
      this.setStatus({ state: 'error', reason })
      return this.status
    }

    this.mdnsDiscovery.advertise({
      connectId: identity.connectId,
      hostname: identity.displayName,
      transferPort: settings.transferPort,
      authPort: settings.authPort,
      apiVersion: SELF_REPORTED_API_VERSION
    })
    this.mdnsDiscovery.browse((discovered) => {
      void this.handleDiscoveredPeer(discovered, identity.connectId, settings)
    })

    this.setStatus({
      state: 'running',
      reason: 'Transfer and registration sockets are bound and accepting connections.',
      startedAt: Date.now()
    })
    return this.status
  }

  async stop(): Promise<LanShareServiceStatus> {
    this.mdnsDiscovery.destroy()
    await this.registrationServer?.stop()
    this.registrationServer = null
    await this.transferServer?.stop()
    this.transferServer = null
    this.setStatus({ state: 'stopped', reason: 'Stopped by request.' })
    return this.status
  }

  /**
   * Real spec §24 "before suspend": stop accepting new transfers and tear
   * down listening sockets before the OS actually suspends, rather than
   * leaving them bound across a sleep where the network state goes stale.
   * Any transfer mid-flight is left in whatever state `stop()` leaves it —
   * genuinely interrupted, not silently marked complete.
   */
  async handleSystemSuspend(): Promise<void> {
    this.wasRunningBeforeSuspend = this.status.state === 'running'
    if (this.wasRunningBeforeSuspend) {
      await this.stop()
      this.setStatus({
        state: 'stopped',
        reason: 'Stopped automatically because the system is suspending.'
      })
    }
  }

  /**
   * Real spec §24 "after resume": rebind sockets, re-advertise via mDNS,
   * and re-browse for peers — exactly what `start()` already does — but
   * only if this service was actually running before suspend.
   */
  async handleSystemResume(): Promise<void> {
    if (this.wasRunningBeforeSuspend) {
      this.wasRunningBeforeSuspend = false
      await this.start()
    }
  }

  async getHealth(): Promise<LanShareHealth> {
    const settings = await this.settingsStore.get()
    return {
      serviceState: this.status.state,
      transferPortBound: this.transferServer !== null,
      authPortBound: this.registrationServer !== null,
      receiveDirectoryWritable: await this.checkReceiveDirectoryWritable(settings.receiveDirectory),
      interfaceCount: this.interfaceManager.list().length
    }
  }

  /**
   * Real send-side entry point (spec §14, Phase LAN-5). Builds a real
   * manifest from the given source paths (real preflight — rejects
   * unsafe sources, computes real size/count), then enqueues a real,
   * concurrency-bounded job whose dispatch is a real
   * `ProcessTransferOpRequest` announcement to the peer. The actual
   * file bytes never move yet — `StartTransfer` is honestly
   * unimplemented until Phase LAN-6 builds the receiving/staging
   * engine that would write what it pulls.
   */
  async sendFiles(peerId: string, sourcePaths: string[]): Promise<LanShareTransferJob> {
    const peer = await this.peerStore.get(peerId)
    if (!peer) {
      throw new Error(`Cannot send files: peer "${peerId}" is not known.`)
    }
    const settings = await this.settingsStore.get()
    const manifest = await this.manifestBuilder.build(sourcePaths)
    const useCompression = settings.compressionMode !== 'off'

    const job = await this.transferQueue.enqueue({
      direction: 'send',
      peerId: peer.id,
      displayName: manifest.nameIfSingle ?? manifest.topDirBasenames.join(', '),
      itemCount: manifest.itemCount,
      totalBytes: manifest.totalBytes,
      useCompression
    })

    // Real send-side state for `StartTransfer` (Phase LAN-6) — the
    // receiver pulls from this map by `OpInfo.ident` (the job id) once
    // it accepts, which can happen well after the announcement RPC
    // itself returns, so this stays populated independent of the
    // announcement's own success/failure.
    this.pendingSendOperations.set(job.id, {
      files: manifest.entries.map((entry) => ({
        absolutePath: entry.absolutePath,
        relativePath: entry.relativePath,
        fileType: entry.fileType,
        mode: entry.mode,
        mtimeMs: entry.mtimeMs,
        symlinkTarget: entry.symlinkTarget
      }))
    })

    return job
  }

  private async dispatchTransferJob(job: LanShareTransferJob): Promise<void> {
    const peer = await this.peerStore.get(job.peerId)
    if (!peer) {
      throw new Error(`Cannot announce transfer: peer "${job.peerId}" is no longer known.`)
    }
    const settings = await this.settingsStore.get()
    const request: NdxTransferOpRequest = {
      info: {
        ident: job.id,
        timestamp: String(job.createdAt),
        readable_name: job.displayName,
        use_compression: job.useCompression
      },
      sender_name: settings.deviceDisplayName,
      receiver_name: peer.displayName,
      receiver: peer.id,
      size: String(job.totalBytes ?? 0),
      count: String(job.itemCount),
      name_if_single: job.itemCount === 1 ? job.displayName : '',
      mime_if_single: '',
      top_dir_basenames: [job.displayName]
    }
    await this.transferClient.announceTransfer(peer.addresses[0], peer.transferPort, request)
  }

  private async recordIncomingTransfer(
    request: NdxTransferOpRequest,
    peerAddress: string
  ): Promise<void> {
    const job = await this.transferStore.create({
      direction: 'receive',
      peerId: peerAddress,
      displayName: request.info.readable_name || request.name_if_single || 'Incoming transfer',
      itemCount: Number(request.count) || 1,
      totalBytes: Number(request.size) || undefined,
      useCompression: request.info.use_compression
    })
    this.incomingRemoteIdents.set(job.id, request.info.ident)
    await this.transferStore.updateStatus(job.id, 'waiting-for-approval')
  }

  /**
   * Real receive flow (spec §15, Phase LAN-6): reserve a real staging
   * directory, pull the real chunk stream from the sender (looked up
   * by matching the announcing address against a real, already-known
   * peer — the sender's real transfer port is never guessed or
   * assumed), write every chunk through the real path-safety checks,
   * then atomically commit into the real receive directory with real
   * conflict-safe naming. Any real failure at any step lands the job
   * in `failed` with the real error message and cleans up staging —
   * never a half-written file left in the final destination.
   */
  async acceptIncomingTransfer(jobId: string): Promise<LanShareTransferJob> {
    const job = await this.transferStore.get(jobId)
    if (!job || job.direction !== 'receive' || job.status !== 'waiting-for-approval') {
      throw new Error(`Job "${jobId}" is not a real pending incoming transfer.`)
    }
    const peers = await this.peerStore.list()
    const sender = peers.find((peer) => peer.addresses.includes(job.peerId))
    if (!sender) {
      throw new Error(
        `Cannot accept: the sender at "${job.peerId}" has no known real transfer port (discover or add it as a peer first).`
      )
    }
    const remoteIdent = this.incomingRemoteIdents.get(job.id)
    if (!remoteIdent) {
      throw new Error(`Cannot accept: no remote transfer ident was recorded for job "${job.id}".`)
    }

    const settings = await this.settingsStore.get()
    const stagingRoot = this.receiveEngine.stagingRootFor(settings.receiveDirectory, job.id)
    await this.transferStore.updateStatus(job.id, 'transferring', { startedAt: Date.now() })

    try {
      await this.receiveEngine.beginStaging(stagingRoot)
      let transferredBytes = 0
      await this.transferClient.pullTransfer(
        sender.addresses[0],
        sender.transferPort,
        {
          ident: remoteIdent,
          timestamp: String(Date.now()),
          readable_name: job.displayName,
          use_compression: job.useCompression
        },
        async (chunk) => {
          const writtenBytes = await this.receiveEngine.writeChunk(
            stagingRoot,
            chunk,
            job.useCompression
          )
          transferredBytes += writtenBytes
          // Real security boundary: a genuine Warpinator-compatible
          // sender's real (decompressed) bytes never sum past the total
          // it itself declared in `TransferOpRequest.size`. A sender
          // that keeps streaming past that is not behaving like a real
          // client and must be stopped before it fills the receiver's
          // disk — this is the one real defense against an
          // unbounded-write/disk-fill attack from a peer that has
          // already passed trust/approval.
          if (job.totalBytes !== undefined && transferredBytes > job.totalBytes) {
            throw new Error(
              `Sender streamed ${transferredBytes} real bytes, past its own declared total of ${job.totalBytes}.`
            )
          }
          await this.transferStore.updateStatus(job.id, 'transferring', { transferredBytes })
        }
      )
      await this.transferStore.updateStatus(job.id, 'committing')
      await this.receiveEngine.commit(stagingRoot, settings.receiveDirectory)
      await this.transferStore.updateStatus(job.id, 'completed', { completedAt: Date.now() })
    } catch (error) {
      await this.receiveEngine.cleanup(stagingRoot)
      await this.transferStore.updateStatus(job.id, 'failed', {
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: Date.now()
      })
    } finally {
      this.incomingRemoteIdents.delete(job.id)
    }

    return (await this.transferStore.get(job.id)) ?? job
  }

  async rejectIncomingTransfer(jobId: string): Promise<LanShareTransferJob | undefined> {
    return this.transferStore.updateStatus(jobId, 'rejected', { completedAt: Date.now() })
  }

  /**
   * Real manual-connection protocol probe (spec §10 "Manual connection
   * ... Protocol probe"). Attempts the real v1 registration handshake
   * against the entered address/ports and records the real result —
   * never assumes a manually-entered peer is reachable or compatible
   * just because the user typed an address.
   */
  async probeManualPeer(address: string, transferPort: number, authPort: number): Promise<void> {
    const settings = await this.settingsStore.get()
    const identity = await this.identityStore.get()
    await this.handleDiscoveredPeer(
      {
        connectId: '',
        hostname: address,
        addresses: [address],
        transferPort,
        authPort,
        apiVersion: 1
      },
      identity.connectId,
      settings
    )
  }

  private async handleDiscoveredPeer(
    discovered: DiscoveredLanSharePeer,
    ownConnectId: string,
    settings: LanShareSettings
  ): Promise<void> {
    if (discovered.connectId === ownConnectId) return
    const address = discovered.addresses[0]
    if (!address) return

    try {
      const own = await this.buildOwnRegistration(settings, ownConnectId)
      const response = await this.registrationClient.registerWithPeer(
        address,
        discovered.authPort,
        own
      )
      const v2 = await this.attemptCertificateExchange(address, response)
      await this.peerStore.upsertSeen(
        {
          id: response.service_id,
          displayName: response.hostname,
          addresses: [address],
          transferPort: discovered.transferPort,
          authPort: response.auth_port,
          registrationVersion: response.api_version >= 2 ? 2 : 1,
          platform: 'unknown',
          status: 'online',
          fingerprint: v2?.fingerprint,
          groupMatch: v2?.groupMatch
        },
        'mdns'
      )
    } catch {
      // A real registration failure (unreachable, refused, incompatible
      // peer) is still worth recording — honestly, as `incompatible`,
      // not silently dropped and not fabricated as a successful peer.
      await this.peerStore.upsertSeen(
        {
          id: `${address}:${discovered.transferPort}`,
          displayName: discovered.hostname,
          addresses: [address],
          transferPort: discovered.transferPort,
          authPort: discovered.authPort,
          registrationVersion: 'unknown',
          platform: 'unknown',
          status: 'incompatible'
        },
        'mdns'
      )
    }
  }

  /**
   * Real v2 certificate exchange (spec §13), attempted only when the
   * peer claims `api_version >= 2`. A real decryption failure (group
   * mismatch) or any transport failure (peer is v1-only, unreachable
   * for this call) is caught and reported as "no real group match" —
   * never a fabricated fingerprint.
   */
  private async attemptCertificateExchange(
    address: string,
    peerRegistration: NdxServiceRegistration
  ): Promise<{ fingerprint: string; groupMatch: boolean } | undefined> {
    if (peerRegistration.api_version < 2) return undefined
    try {
      const groupCode = await this.groupCodeStore.get()
      const result = await this.registrationClient.requestCertificate(
        address,
        peerRegistration.auth_port,
        groupCode,
        {
          ip: peerRegistration.ip,
          hostname: peerRegistration.hostname,
          ipv6: peerRegistration.ipv6
        }
      )
      if (!result) return { fingerprint: '', groupMatch: false }
      const fingerprint = computeFingerprint(result.certificatePem)
      return { fingerprint, groupMatch: true }
    } catch {
      return undefined
    }
  }

  private async recordPeerFromRegistration(
    registration: NdxServiceRegistration,
    peerAddress: string
  ): Promise<void> {
    const address = parsePeerHost(peerAddress) ?? registration.ip
    await this.peerStore.upsertSeen(
      {
        id: registration.service_id,
        displayName: registration.hostname,
        addresses: [address],
        transferPort: registration.port,
        authPort: registration.auth_port,
        registrationVersion: registration.api_version >= 2 ? 2 : 1,
        platform: 'unknown',
        status: 'online'
      },
      'history'
    )
  }

  private async buildOwnRegistration(
    settings: LanShareSettings,
    connectId: string
  ): Promise<NdxServiceRegistration> {
    const interfaces = this.interfaceManager.list()
    const ipv4 = interfaces.find((iface) => iface.family === 'IPv4')?.address ?? '0.0.0.0'
    const ipv6 = interfaces.find((iface) => iface.family === 'IPv6')?.address ?? ''
    return {
      service_id: connectId,
      ip: ipv4,
      port: settings.transferPort,
      hostname: settings.deviceDisplayName,
      api_version: SELF_REPORTED_API_VERSION,
      auth_port: settings.authPort,
      ipv6
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

  private setStatus(status: LanShareServiceStatus): void {
    this.status = status
    for (const listener of this.listeners) listener(status)
  }
}

function computeFingerprint(certificatePem: string): string {
  return createHash('sha256').update(certificatePem).digest('hex')
}
