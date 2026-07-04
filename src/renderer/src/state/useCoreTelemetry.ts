import { useSyncExternalStore } from 'react'
import type { SystemMetricsSnapshot } from '@shared/contracts'
import { collectSystemMetrics } from '../services/ipc/systemClient'

export type KernelStatus = 'stable' | 'degraded' | 'offline' | 'unknown'

export interface CoreTelemetry {
  latencyMs: number | null
  uptimeSeconds: number | null
  kernelStatus: KernelStatus
  /** Full last-fetched snapshot, shared with the footer's poll so other screens don't re-fetch it. */
  snapshot: SystemMetricsSnapshot | null
}

const POLL_INTERVAL_MS = 5000
const DEGRADED_LATENCY_MS = 250

const INITIAL_TELEMETRY: CoreTelemetry = {
  latencyMs: null,
  uptimeSeconds: null,
  kernelStatus: 'unknown',
  snapshot: null
}

let telemetry: CoreTelemetry = INITIAL_TELEMETRY
const listeners = new Set<() => void>()
let pollHandle: ReturnType<typeof setInterval> | null = null

function notify(): void {
  listeners.forEach((listener) => listener())
}

async function poll(): Promise<void> {
  const startedAt = performance.now()
  try {
    const result = await collectSystemMetrics()
    const latencyMs = Math.round(performance.now() - startedAt)

    telemetry = result.ok
      ? {
          latencyMs,
          uptimeSeconds: result.data.core?.uptimeSeconds ?? null,
          kernelStatus: latencyMs < DEGRADED_LATENCY_MS ? 'stable' : 'degraded',
          snapshot: result.data
        }
      : { ...telemetry, latencyMs, kernelStatus: 'offline' }
  } catch {
    telemetry = { ...telemetry, kernelStatus: 'offline' }
  }
  notify()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (listeners.size === 1) {
    void poll()
    pollHandle = setInterval(() => void poll(), POLL_INTERVAL_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && pollHandle) {
      clearInterval(pollHandle)
      pollHandle = null
    }
  }
}

function getSnapshot(): CoreTelemetry {
  return telemetry
}

/**
 * Real Footer telemetry (Latency/Uptime/Kernel) plus the full system-metrics
 * snapshot — every value comes from an actual renderer<->main IPC round trip
 * to the core `SystemMetricsService` (mega-prompt §27). This is a shared
 * singleton poll (one 5s interval for the whole app, started on first
 * subscriber) rather than a per-hook-instance fetch, so screens that also
 * need RAM/storage data (e.g. the Home Command Center's System Health card)
 * read the same already-in-flight snapshot instead of triggering a second
 * independent collection.
 */
export function useCoreTelemetry(): CoreTelemetry {
  return useSyncExternalStore(subscribe, getSnapshot)
}

/** Resets the shared telemetry store — call in `afterEach` in unit tests. */
export function resetCoreTelemetry(): void {
  listeners.clear()
  if (pollHandle) {
    clearInterval(pollHandle)
    pollHandle = null
  }
  telemetry = INITIAL_TELEMETRY
}

export function formatUptime(uptimeSeconds: number | null): string {
  if (uptimeSeconds === null) return '--'
  const hours = Math.floor(uptimeSeconds / 3600)
  const minutes = Math.floor((uptimeSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  const seconds = Math.floor(uptimeSeconds % 60)
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function formatKernelStatus(status: KernelStatus): string {
  switch (status) {
    case 'stable':
      return 'STABLE'
    case 'degraded':
      return 'DEGRADED'
    case 'offline':
      return 'OFFLINE'
    default:
      return 'SYNCING'
  }
}
