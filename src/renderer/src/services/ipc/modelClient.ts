import type {
  AddModelProviderRequest,
  ConnectionTestResult,
  ModelProvider,
  ModelProviderIdRequest,
  ModelRouteRequest,
  ModelRouteDecision,
  ModelCompletionRequest,
  ModelCompletionResult,
  SetModelProviderEnabledRequest,
  LocalModelRequest,
  LocalModelStatus,
  ModelBenchmarkResult,
  NdxResult
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listModelProviders(): Promise<NdxResult<ModelProvider[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.modelProviders.list()
}

export async function setModelProviderEnabled(
  request: SetModelProviderEnabledRequest
): Promise<NdxResult<ModelProvider>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.modelProviders.setEnabled(request)
}

export async function routeModel(
  request: ModelRouteRequest
): Promise<NdxResult<ModelRouteDecision>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.modelProviders.route(request)
}

export async function completeModel(
  request: ModelCompletionRequest
): Promise<NdxResult<ModelCompletionResult>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.modelProviders.complete(request)
}

export async function getLocalModelStatus(
  request: ModelProviderIdRequest
): Promise<NdxResult<LocalModelStatus>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.modelProviders.localStatus(request)
}

export async function loadLocalModel(request: LocalModelRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.modelProviders.loadLocal(request)
}

export async function unloadLocalModel(request: LocalModelRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.modelProviders.unloadLocal(request)
}

export async function benchmarkLocalModel(
  request: LocalModelRequest
): Promise<NdxResult<ModelBenchmarkResult>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.modelProviders.benchmarkLocal(request)
}

export async function addModelProvider(
  request: AddModelProviderRequest
): Promise<NdxResult<ModelProvider>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.modelProviders.add(request)
}

export async function removeModelProvider(
  request: ModelProviderIdRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.modelProviders.remove(request)
}

export async function testModelProviderConnection(
  request: ModelProviderIdRequest
): Promise<NdxResult<ConnectionTestResult>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.modelProviders.testConnection(request)
}
