import { app, ipcMain } from 'electron'
import { IPC_CHANNELS, type DiagnosticsInfo, type NdxResult } from '@shared/contracts'
import type { ModelProviderStore } from '../../core/models/ModelProviderStore'

/** Real ND-056 About/Diagnostics IPC — every field is a genuine runtime/package value, never a fabricated build hash or version. */
export function registerDiagnosticsHandlers(modelProviderStore: ModelProviderStore): void {
  ipcMain.handle(IPC_CHANNELS.diagnosticsGet, async (): Promise<NdxResult<DiagnosticsInfo>> => {
    const providers = await modelProviderStore.list()
    return {
      ok: true,
      data: {
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
  })
}
