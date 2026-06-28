import type {
  CreateVaultItemRequest,
  NdxResult,
  RevealVaultItemResult,
  RotateVaultItemRequest,
  UpdateVaultItemRequest,
  VaultAccessLogEntry,
  VaultItem,
  VaultItemIdRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listVaultItems(): Promise<NdxResult<VaultItem[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.vault) return bridgeUnavailableError()
  return bridge.vault.list()
}

export async function createVaultItem(
  request: CreateVaultItemRequest
): Promise<NdxResult<VaultItem>> {
  const bridge = getNdxBridge()
  if (!bridge?.vault) return bridgeUnavailableError()
  return bridge.vault.create(request)
}

export async function updateVaultItem(
  request: UpdateVaultItemRequest
): Promise<NdxResult<VaultItem>> {
  const bridge = getNdxBridge()
  if (!bridge?.vault) return bridgeUnavailableError()
  return bridge.vault.update(request)
}

export async function rotateVaultItem(
  request: RotateVaultItemRequest
): Promise<NdxResult<VaultItem>> {
  const bridge = getNdxBridge()
  if (!bridge?.vault) return bridgeUnavailableError()
  return bridge.vault.rotate(request)
}

export async function revealVaultItem(
  request: VaultItemIdRequest
): Promise<NdxResult<RevealVaultItemResult>> {
  const bridge = getNdxBridge()
  if (!bridge?.vault) return bridgeUnavailableError()
  return bridge.vault.reveal(request)
}

export async function deleteVaultItem(request: VaultItemIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge?.vault) return bridgeUnavailableError()
  return bridge.vault.remove(request)
}

export async function listVaultAccessLog(): Promise<NdxResult<VaultAccessLogEntry[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.vault) return bridgeUnavailableError()
  return bridge.vault.listAccessLog()
}
