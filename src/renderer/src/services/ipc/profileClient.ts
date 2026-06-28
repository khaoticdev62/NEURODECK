import type {
  CreateProfileRequest,
  NdxBridge,
  NdxResult,
  ProfileIdRequest,
  ProfileState,
  StartProfileSessionRequest,
  UpdateProfileRequest,
  UserProfile
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

function getProfileBridge(): NdxBridge['profiles'] | null {
  return getNdxBridge()?.profiles ?? null
}

export async function getProfileState(): Promise<NdxResult<ProfileState>> {
  const bridge = getProfileBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.getState()
}

export async function createProfile(
  request: CreateProfileRequest
): Promise<NdxResult<UserProfile>> {
  const bridge = getProfileBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.create(request)
}

export async function updateProfile(
  request: UpdateProfileRequest
): Promise<NdxResult<UserProfile>> {
  const bridge = getProfileBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.update(request)
}

export async function deleteProfile(request: ProfileIdRequest): Promise<NdxResult<ProfileState>> {
  const bridge = getProfileBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.remove(request)
}

export async function startProfileSession(
  request: StartProfileSessionRequest
): Promise<NdxResult<ProfileState>> {
  const bridge = getProfileBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.startSession(request)
}

export async function endPrivateProfileSession(): Promise<NdxResult<ProfileState>> {
  const bridge = getProfileBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.endPrivateSession()
}
