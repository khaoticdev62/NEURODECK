import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/contracts'
import type { NetworkDiagnostics, NdxResult } from '@shared/contracts'
import type { NetworkService } from '../../core/network/NetworkService'

export function registerNetworkHandlers(networkService: NetworkService): void {
  ipcMain.handle(
    IPC_CHANNELS.networkGetDiagnostics,
    async (): Promise<NdxResult<NetworkDiagnostics>> => {
      try {
        return { ok: true, data: await networkService.getDiagnostics() }
      } catch (error) {
        return {
          ok: false,
          error: {
            category: 'system',
            code: 'network-diagnostics-failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            userMessage: 'Could not collect network diagnostics.',
            retryable: true,
            correlationId: `net-${Date.now()}`
          }
        }
      }
    }
  )
}
