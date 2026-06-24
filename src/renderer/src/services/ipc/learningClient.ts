import type {
  CreateUserCurriculumRequest,
  Curriculum,
  CurriculumIdRequest,
  CurriculumProgress,
  NdxResult,
  UpdateProgressRequest,
  UpdateUserCurriculumRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listCurricula(): Promise<NdxResult<Curriculum[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.learning.listCurricula()
}

export async function getCurriculum(request: CurriculumIdRequest): Promise<NdxResult<Curriculum>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.learning.getCurriculum(request)
}

export async function createUserCurriculum(
  request: CreateUserCurriculumRequest
): Promise<NdxResult<Curriculum>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.learning.createUserCurriculum(request)
}

export async function updateUserCurriculum(
  request: UpdateUserCurriculumRequest
): Promise<NdxResult<Curriculum>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.learning.updateUserCurriculum(request)
}

export async function deleteUserCurriculum(request: CurriculumIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.learning.deleteUserCurriculum(request)
}

export async function getProgress(): Promise<NdxResult<CurriculumProgress>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.learning.getProgress()
}

export async function updateProgress(
  request: UpdateProgressRequest
): Promise<NdxResult<CurriculumProgress>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.learning.updateProgress(request)
}
