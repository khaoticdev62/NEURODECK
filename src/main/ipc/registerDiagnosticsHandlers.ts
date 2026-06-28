import { app, ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  ndxError,
  supportBundleRecordSchema,
  type DiagnosticsInfo,
  type NdxResult,
  type SupportBundleRecord
} from '@shared/contracts'
import type { ModelProviderStore } from '../../core/models/ModelProviderStore'
import type { SupportBundleService } from '../../core/support/SupportBundleService'

/** Real ND-056 About/Diagnostics IPC: runtime/package values only, never fabricated build metadata. */
export function registerDiagnosticsHandlers(
  modelProviderStore: ModelProviderStore,
  supportBundleService: SupportBundleService
): void {
  const collectDiagnostics = async (): Promise<DiagnosticsInfo> => {
    const providers = await modelProviderStore.list()
    return {
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron ?? 'unknown',
      chromeVersion: process.versions.chrome ?? 'unknown',
      nodeVersion: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      license: 'Not specified',
      modelProviderNames: providers.map((provider) => provider.name)
    }
  }

  ipcMain.handle(IPC_CHANNELS.diagnosticsGet, async (): Promise<NdxResult<DiagnosticsInfo>> => {
    return { ok: true, data: await collectDiagnostics() }
  })

  ipcMain.handle(
    IPC_CHANNELS.diagnosticsCreateSupportBundle,
    async (): Promise<NdxResult<SupportBundleRecord>> => {
      try {
        const record = await supportBundleService.create()
        return { ok: true, data: supportBundleRecordSchema.parse(record) }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'system',
            'support-bundle-create-failed',
            'Could not create the support bundle.',
            { message: error instanceof Error ? error.message : 'Unknown support bundle failure.' }
          )
        }
      }
    }
  )
}
