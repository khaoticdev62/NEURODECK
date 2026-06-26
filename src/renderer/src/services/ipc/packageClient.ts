import type {
  FlatpakPermissionPreview,
  FlatpakRefRequest,
  FlatpakRemoteApp,
  FlatpakSearchRequest,
  NdxResult,
  TransactionIdRequest,
  TransactionRecord
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function searchFlatpak(
  request: FlatpakSearchRequest
): Promise<NdxResult<FlatpakRemoteApp[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.packages.flatpakSearch(request)
}

export async function previewFlatpakPermissions(
  request: FlatpakRefRequest
): Promise<NdxResult<FlatpakPermissionPreview>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.packages.flatpakPermissions(request)
}

export async function installFlatpak(
  request: FlatpakRefRequest
): Promise<NdxResult<TransactionRecord>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.packages.flatpakInstall(request)
}

export async function updateFlatpak(
  request: FlatpakRefRequest
): Promise<NdxResult<TransactionRecord>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.packages.flatpakUpdate(request)
}

export async function uninstallFlatpak(
  request: FlatpakRefRequest
): Promise<NdxResult<TransactionRecord>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.packages.flatpakUninstall(request)
}

export async function listPackageTransactions(): Promise<NdxResult<TransactionRecord[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.packages.listTransactions()
}

export async function cancelPackageTransaction(
  request: TransactionIdRequest
): Promise<NdxResult<boolean>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.packages.cancelTransaction(request)
}

export function onPackageTransactionUpdate(
  listener: (transactions: TransactionRecord[]) => void
): () => void {
  return getNdxBridge()?.packages.onTransactionUpdate(listener) ?? (() => undefined)
}
