import { useEffect, useRef, useState } from 'react'
import { collectSystemMetrics } from '../services/ipc/systemClient'

export type KernelStatus = 'stable' | 'degraded' | 'offline' | 'unknown'

export interface CoreTelemetry {
  latencyMs: number | null
  uptimeSeconds: number | null
  kernelStatus: KernelStatus
}

const POLL_INTERVAL_MS = 5000
const DEGRADED_LATENCY_MS = 250

const INITIAL_TELEMETRY: CoreTelemetry = {
  latencyMs: null,
  uptimeSeconds: null,
  kernelStatus: 'unknown'
}

/**
 * Real Footer telemetry (Latency/Uptime/Kernel). Every value comes from an
 * actual renderer<->main IPC round trip to the core `SystemMetricsService`
 * (mega-prompt §27) — Latency is that round trip's own measured duration
 * (no synthetic ping, no network dependency), Uptime is the real core
 * process uptime, and Kernel status reflects whether the round trip
 * actually succeeded rather than a hardcoded "STABLE" label.
 */
export function useCoreTelemetry(): CoreTelemetry {
  const [telemetry, setTelemetry] = useState<CoreTelemetry>(INITIAL_TELEMETRY)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true

    async function poll(): Promise<void> {
      const startedAt = performance.now()
      const result = await collectSystemMetrics()
      const latencyMs = Math.round(performance.now() - startedAt)
      if (!activeRef.current) return

      if (result.ok) {
        setTelemetry({
          latencyMs,
          uptimeSeconds: result.data.core.uptimeSeconds,
          kernelStatus: latencyMs < DEGRADED_LATENCY_MS ? 'stable' : 'degraded'
        })
      } else {
        setTelemetry((current) => ({ ...current, latencyMs, kernelStatus: 'offline' }))
      }
    }

    void poll()
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS)
    return () => {
      activeRef.current = false
      clearInterval(interval)
    }
  }, [])

  return telemetry
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
