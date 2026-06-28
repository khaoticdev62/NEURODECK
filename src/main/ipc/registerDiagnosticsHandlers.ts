import { app, ipcMain } from 'electron'
import {
  crashReportSchema,
  createRendererCrashReportRequestSchema,
  IPC_CHANNELS,
  ndxError,
  supportBundleRecordSchema,
  type CrashReport,
  type DiagnosticsInfo,
  type NdxResult,
  type SupportBundleRecord
} from '@shared/contracts'
import type { ModelProviderStore } from '../../core/models/ModelProviderStore'
import type { CrashReportStore } from '../../core/support/CrashReportStore'
import type { SupportBundleService } from '../../core/support/SupportBundleService'

/** Real ND-056 About/Diagnostics IPC: runtime/package values only, never fabricated build metadata. */
export function registerDiagnosticsHandlers(
  modelProviderStore: ModelProviderStore,
  supportBundleService: SupportBundleService,
  crashReportStore: CrashReportStore
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

  ipcMain.handle(
    IPC_CHANNELS.diagnosticsListCrashReports,
    async (): Promise<NdxResult<CrashReport[]>> => {
      try {
        const reports = await crashReportStore.list()
        return { ok: true, data: reports.map((report) => crashReportSchema.parse(report)) }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'system',
            'crash-report-list-failed',
            'Could not load local crash reports.',
            { message: error instanceof Error ? error.message : 'Unknown crash report failure.' }
          )
        }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.diagnosticsRecordRendererCrashReport,
    async (_event, payload: unknown): Promise<NdxResult<CrashReport>> => {
      const parsed = createRendererCrashReportRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'invalid-crash-report',
            'The renderer crash report payload was invalid.',
            { details: { issues: parsed.error.issues } }
          )
        }
      }
      try {
        const report = await crashReportStore.recordRendererError(parsed.data)
        return { ok: true, data: crashReportSchema.parse(report) }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'system',
            'crash-report-record-failed',
            'Could not save the local crash report.',
            { message: error instanceof Error ? error.message : 'Unknown crash report failure.' }
          )
        }
      }
    }
  )
}
