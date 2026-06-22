import { ipcMain } from 'electron'
import {
  addModelProviderRequestSchema,
  IPC_CHANNELS,
  localModelRequestSchema,
  modelCompletionRequestSchema,
  modelProviderIdRequestSchema,
  modelRouteRequestSchema,
  setModelProviderEnabledRequestSchema,
  ndxError,
  type ConnectionTestResult,
  type ModelProvider,
  type ModelCompletionResult,
  type ModelRouteDecision,
  type LocalModelStatus,
  type ModelBenchmarkResult,
  type NdxResult
} from '@shared/contracts'
import type { ModelProviderService } from '../../core/models/ModelProviderService'
import type { ModelProviderStore } from '../../core/models/ModelProviderStore'
import type { ModelRouter } from '../../core/models/ModelRouter'
import type { OllamaRuntimeService } from '../../core/models/OllamaRuntimeService'

/**
 * Real handlers backed by `ModelProviderStore`/`ModelProviderService`.
 * The renderer never receives an API key — handlers either return
 * `ModelProvider` (no secret field) or decrypt the key internally just
 * long enough to make one outbound request in `testConnection`.
 */
export function registerModelHandlers(
  store: ModelProviderStore,
  service: ModelProviderService,
  router: ModelRouter,
  runtime: OllamaRuntimeService
): void {
  ipcMain.handle(IPC_CHANNELS.modelProviderList, async (): Promise<NdxResult<ModelProvider[]>> => {
    return { ok: true, data: await store.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.modelProviderAdd,
    async (_event, payload: unknown): Promise<NdxResult<ModelProvider>> => {
      const parsed = addModelProviderRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await store.add(parsed.data) }
      } catch (error) {
        return { ok: false, error: toModelError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.modelProviderRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = modelProviderIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      await store.remove(parsed.data.providerId)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.modelProviderTestConnection,
    async (_event, payload: unknown): Promise<NdxResult<ConnectionTestResult>> => {
      const parsed = modelProviderIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()

      const baseUrl = await store.getBaseUrl(parsed.data.providerId)
      if (!baseUrl) {
        return {
          ok: false,
          error: ndxError('not-found', 'provider-not-found', 'That provider no longer exists.')
        }
      }

      try {
        const apiKey = await store.getApiKey(parsed.data.providerId)
        return { ok: true, data: await service.testConnection(baseUrl, apiKey) }
      } catch (error) {
        return { ok: false, error: toModelError(error) }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.modelProviderSetEnabled, async (_event, payload: unknown) => {
    const parsed = setModelProviderEnabledRequestSchema.safeParse(payload)
    if (!parsed.success) return invalidRequest()
    const provider = await store.setEnabled(parsed.data.providerId, parsed.data.enabled)
    return provider
      ? { ok: true as const, data: provider }
      : {
          ok: false as const,
          error: ndxError('not-found', 'provider-not-found', 'Provider not found.')
        }
  })

  ipcMain.handle(
    IPC_CHANNELS.modelRoute,
    async (_event, payload: unknown): Promise<NdxResult<ModelRouteDecision>> => {
      const parsed = modelRouteRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await router.route(parsed.data) }
      } catch (error) {
        return { ok: false, error: toModelError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.modelComplete,
    async (_event, payload: unknown): Promise<NdxResult<ModelCompletionResult>> => {
      const parsed = modelCompletionRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await router.complete(parsed.data) }
      } catch (error) {
        return { ok: false, error: toModelError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.localModelStatus,
    async (_event, payload: unknown): Promise<NdxResult<LocalModelStatus>> => {
      const parsed = modelProviderIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const provider = await store.get(parsed.data.providerId)
      if (!provider)
        return {
          ok: false,
          error: ndxError('not-found', 'provider-not-found', 'Provider not found.')
        }
      if (provider.kind !== 'ollama')
        return {
          ok: true,
          data: {
            providerId: provider.id,
            supported: false,
            runningModelIds: [],
            reason: 'Runtime controls require an Ollama provider.'
          }
        }
      return { ok: true, data: await runtime.status(provider.id, provider.baseUrl) }
    }
  )

  const localAction =
    (action: 'load' | 'unload' | 'benchmark') =>
    async (_event: unknown, payload: unknown): Promise<NdxResult<null | ModelBenchmarkResult>> => {
      const parsed = localModelRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const provider = await store.get(parsed.data.providerId)
      if (!provider || provider.kind !== 'ollama')
        return {
          ok: false,
          error: ndxError('not-found', 'ollama-provider-not-found', 'Ollama provider not found.')
        }
      try {
        if (action === 'benchmark')
          return { ok: true, data: await runtime.benchmark(provider.baseUrl, parsed.data.modelId) }
        await runtime[action](provider.baseUrl, parsed.data.modelId)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toModelError(error) }
      }
    }
  ipcMain.handle(IPC_CHANNELS.localModelLoad, localAction('load'))
  ipcMain.handle(IPC_CHANNELS.localModelUnload, localAction('unload'))
  ipcMain.handle(IPC_CHANNELS.localModelBenchmark, localAction('benchmark'))
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That model provider request is invalid.')
  }
}

function toModelError(error: unknown): ReturnType<typeof ndxError> {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return ndxError('system', 'model-provider-operation-failed', message, { message })
}
