import type {
  CreateSteamShortcutRequest,
  NdxResult,
  RemoveSteamShortcutRequest,
  RestoreSteamShortcutBackupRequest,
  SelectSteamProfileRequest,
  SteamRunningState,
  SteamShortcutBackup,
  SteamShortcutEntry,
  SteamUserProfile,
  UpdateSteamShortcutRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listSteamProfiles(): Promise<NdxResult<SteamUserProfile[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.steamShortcuts) return bridgeUnavailableError()
  return bridge.steamShortcuts.listProfiles()
}

export async function listSteamShortcuts(
  request: SelectSteamProfileRequest
): Promise<NdxResult<SteamShortcutEntry[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.steamShortcuts) return bridgeUnavailableError()
  return bridge.steamShortcuts.list(request)
}

export async function createSteamShortcut(
  request: CreateSteamShortcutRequest
): Promise<NdxResult<SteamShortcutEntry[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.steamShortcuts) return bridgeUnavailableError()
  return bridge.steamShortcuts.create(request)
}

export async function updateSteamShortcut(
  request: UpdateSteamShortcutRequest
): Promise<NdxResult<SteamShortcutEntry[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.steamShortcuts) return bridgeUnavailableError()
  return bridge.steamShortcuts.update(request)
}

export async function removeSteamShortcut(
  request: RemoveSteamShortcutRequest
): Promise<NdxResult<SteamShortcutEntry[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.steamShortcuts) return bridgeUnavailableError()
  return bridge.steamShortcuts.remove(request)
}

export async function listSteamShortcutBackups(
  request: SelectSteamProfileRequest
): Promise<NdxResult<SteamShortcutBackup[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.steamShortcuts) return bridgeUnavailableError()
  return bridge.steamShortcuts.listBackups(request)
}

export async function restoreSteamShortcutBackup(
  request: RestoreSteamShortcutBackupRequest
): Promise<NdxResult<SteamShortcutEntry[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.steamShortcuts) return bridgeUnavailableError()
  return bridge.steamShortcuts.restoreBackup(request)
}

export async function checkSteamRunning(
  request: SelectSteamProfileRequest
): Promise<NdxResult<SteamRunningState>> {
  const bridge = getNdxBridge()
  if (!bridge?.steamShortcuts) return bridgeUnavailableError()
  return bridge.steamShortcuts.checkRunning(request)
}
