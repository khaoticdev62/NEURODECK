import type {
  CrashReport,
  CreateRendererCrashReportRequest,
  DiagnosticsInfo,
  NdxResult,
  SupportBundleRecord
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getDiagnosticsInfo(): Promise<NdxResult<DiagnosticsInfo>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.diagnostics.get()
}

export async function createSupportBundle(): Promise<NdxResult<SupportBundleRecord>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.diagnostics.createSupportBundle()
}

export async function listCrashReports(): Promise<NdxResult<CrashReport[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.diagnostics.listCrashReports()
}

export async function recordRendererCrashReport(
  request: CreateRendererCrashReportRequest
): Promise<NdxResult<CrashReport>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.diagnostics.recordRendererCrashReport(request)
}
