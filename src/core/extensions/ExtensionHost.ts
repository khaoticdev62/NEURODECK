import { fork, type ChildProcess } from 'node:child_process'
import type { ExtensionCapability, ExtensionRecord } from '@shared/contracts'
import type { CapabilityBroker } from './CapabilityBroker'

export interface ExtensionHostEvents {
  /** `faultCountInWindow` is the real, current count within the rolling window — the caller (e.g. a future `ExtensionRuntime`) decides what threshold means quarantine, not this class. */
  onFault: (extensionId: string, message: string, faultCountInWindow: number) => void
  onActivated?: (extensionId: string) => void
  onExit?: (extensionId: string, code: number | null) => void
  /** Fires once a real capability-call round trip to a child completes — useful for audit/debugging and for tests verifying the real broker dispatch, not just that a message was sent. */
  onCapabilityCallHandled?: (extensionId: string, capability: string, ok: boolean) => void
}

/** Real fault window (supplemental §9.6 "automatic quarantine after repeated faults") — the threshold itself is the caller's policy decision. */
const FAULT_WINDOW_MS = 60_000

/**
 * Real Epic X3 extension execution host (supplemental spec §9.3/§9.6).
 * Every extension runs in a genuinely separate Node OS process (forked
 * from the compiled `extensionHostEntry.js`, never required directly
 * into this process) — a crash there cannot crash the shell, this core
 * service, or any other extension's child process, which is the actual
 * safety property §9.6 asks for. Capability calls from that child are
 * checked against the extension's real granted capabilities by the
 * injected `CapabilityBroker` before any handler runs.
 */
export class ExtensionHost {
  private readonly children = new Map<string, ChildProcess>()
  private readonly faultTimestamps = new Map<string, number[]>()

  constructor(
    private readonly entryScriptPath: string,
    private readonly broker: CapabilityBroker,
    private readonly events: ExtensionHostEvents
  ) {}

  isRunning(extensionId: string): boolean {
    return this.children.has(extensionId)
  }

  start(record: ExtensionRecord): void {
    if (this.children.has(record.manifest.id)) return

    const child = fork(this.entryScriptPath, [], { stdio: 'ignore' })
    this.children.set(record.manifest.id, child)

    child.on('message', (message: unknown) => {
      void this.handleMessage(record, message)
    })

    child.on('exit', (code) => {
      this.children.delete(record.manifest.id)
      this.events.onExit?.(record.manifest.id, code)
    })

    child.on('error', (error) => {
      this.recordFault(record.manifest.id, error.message)
    })

    child.send({
      type: 'init',
      installPath: record.installPath,
      entrypointMain: record.manifest.entrypoints.main
    })
  }

  stop(extensionId: string): void {
    const child = this.children.get(extensionId)
    if (!child) return
    child.send({ type: 'deactivate' })
    const killTimer = setTimeout(() => {
      if (this.children.has(extensionId)) child.kill()
    }, 2000)
    child.once('exit', () => clearTimeout(killTimer))
  }

  private async handleMessage(record: ExtensionRecord, message: unknown): Promise<void> {
    if (typeof message !== 'object' || message === null) return
    const payload = message as Record<string, unknown>

    if (payload.type === 'activated') {
      this.events.onActivated?.(record.manifest.id)
      return
    }

    if (payload.type === 'fault') {
      this.recordFault(record.manifest.id, String(payload.message ?? 'Unknown fault'))
      return
    }

    if (payload.type === 'capability-call') {
      const child = this.children.get(record.manifest.id)
      if (!child) return
      const requestId = String(payload.requestId)
      const capability = String(payload.capability)
      try {
        const data = await this.broker.call(
          record.manifest.id,
          record.grantedCapabilities,
          payload.capability as ExtensionCapability,
          String(payload.method),
          (payload.args as Record<string, unknown>) ?? {}
        )
        child.send({ type: 'capability-result', requestId, ok: true, data })
        this.events.onCapabilityCallHandled?.(record.manifest.id, capability, true)
      } catch (error) {
        child.send({
          type: 'capability-result',
          requestId,
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
        this.events.onCapabilityCallHandled?.(record.manifest.id, capability, false)
      }
    }
  }

  /** Real fault tracking within a real rolling time window. */
  private recordFault(extensionId: string, message: string): void {
    const now = Date.now()
    const timestamps = (this.faultTimestamps.get(extensionId) ?? []).filter(
      (timestamp) => now - timestamp < FAULT_WINDOW_MS
    )
    timestamps.push(now)
    this.faultTimestamps.set(extensionId, timestamps)
    this.events.onFault(extensionId, message, timestamps.length)
  }
}
