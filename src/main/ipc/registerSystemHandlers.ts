import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  ndxError,
  type NdxResult,
  type SystemMetricsSnapshot
} from '@shared/contracts'
import type { SystemMetricsService } from '../../core/system/SystemMetricsService'

/** Real, read-only system metrics IPC (mega-prompt §27). `SystemMetricsService.collect()` never writes anything — it only reads `node:os` and, on Linux, `sysfs`/`procfs`. */
export function registerSystemHandlers(service: SystemMetricsService): void {
  ipcMain.handle(
    IPC_CHANNELS.systemMetricsCollect,
    async (): Promise<NdxResult<SystemMetricsSnapshot>> => {
      try {
        return { ok: true, data: await service.collect() }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          ok: false,
          error: ndxError('system', 'system-metrics-failed', message, { message })
        }
      }
    }
  )
}
