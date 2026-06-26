import type {
  NdxResult,
  Persona,
  PersonaIdRequest,
  PromptTemplate,
  PromptTemplateIdRequest,
  UpsertPersonaRequest,
  UpsertPromptTemplateRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listPromptTemplates(): Promise<NdxResult<PromptTemplate[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.promptLibrary.listTemplates()
}

export async function upsertPromptTemplate(
  request: UpsertPromptTemplateRequest
): Promise<NdxResult<PromptTemplate>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.promptLibrary.upsertTemplate(request)
}

export async function removePromptTemplate(
  request: PromptTemplateIdRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.promptLibrary.removeTemplate(request)
}

export async function listPersonas(): Promise<NdxResult<Persona[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.promptLibrary.listPersonas()
}

export async function upsertPersona(request: UpsertPersonaRequest): Promise<NdxResult<Persona>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.promptLibrary.upsertPersona(request)
}

export async function removePersona(request: PersonaIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.promptLibrary.removePersona(request)
}
