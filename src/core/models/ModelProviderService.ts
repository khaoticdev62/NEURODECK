import type {
  ConnectionTestResult,
  ModelCompletionRequest,
  ModelInfo,
  ModelUsage
} from '@shared/contracts/model'

const REQUEST_TIMEOUT_MS = 8000

interface OpenAiModelsResponse {
  data?: Array<{ id?: unknown; owned_by?: unknown }>
}

interface OpenAiCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>
  usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown }
}

export interface ProviderCompletion {
  content: string
  usage: ModelUsage
}

/**
 * Real OpenAI-compatible HTTP client (mega-prompt §18.3 "real connection
 * test," "capability discovery"). Calls the provider's actual `/models`
 * endpoint — local (e.g. Ollama at `http://localhost:11434/v1`) or cloud
 * — and reports exactly what it returns. No fabricated model list, no
 * fabricated resource/performance numbers; if the provider is
 * unreachable or returns an error, that's reported honestly too.
 */
export class ModelProviderService {
  async testConnection(baseUrl: string, apiKey: string | null): Promise<ConnectionTestResult> {
    const url = `${baseUrl.replace(/\/+$/, '')}/models`
    const headers: Record<string, string> = {}
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(url, { headers, signal: controller.signal })
      if (!response.ok) {
        return {
          ok: false,
          message: `Provider responded with HTTP ${response.status}.`,
          models: []
        }
      }
      const body = (await response.json()) as OpenAiModelsResponse
      const models = parseModels(body)
      return {
        ok: true,
        message: `Connected. ${models.length} model${models.length === 1 ? '' : 's'} reported.`,
        models
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          ok: false,
          message: `No response after ${REQUEST_TIMEOUT_MS / 1000}s.`,
          models: []
        }
      }
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown connection error.',
        models: []
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  async complete(
    baseUrl: string,
    apiKey: string | null,
    modelId: string,
    request: ModelCompletionRequest,
    signal?: AbortSignal
  ): Promise<ProviderCompletion> {
    const response = await this.request(
      baseUrl,
      apiKey,
      '/chat/completions',
      {
        method: 'POST',
        body: JSON.stringify({
          model: modelId,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: false
        })
      },
      signal
    )
    if (!response.ok) throw new Error(`Provider responded with HTTP ${response.status}.`)
    const body = (await response.json()) as OpenAiCompletionResponse
    const content = body.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('Provider returned no assistant message.')
    return {
      content,
      usage: {
        promptTokens: numberOrUndefined(body.usage?.prompt_tokens),
        completionTokens: numberOrUndefined(body.usage?.completion_tokens),
        totalTokens: numberOrUndefined(body.usage?.total_tokens)
      }
    }
  }

  private async request(
    baseUrl: string,
    apiKey: string | null,
    path: string,
    init: RequestInit = {},
    externalSignal?: AbortSignal
  ): Promise<Response> {
    const headers = new Headers(init.headers)
    headers.set('Content-Type', 'application/json')
    if (apiKey) headers.set('Authorization', `Bearer ${apiKey}`)
    const controller = new AbortController()
    const abort = (): void => controller.abort()
    externalSignal?.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      return await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
        ...init,
        headers,
        signal: controller.signal
      })
    } finally {
      clearTimeout(timeout)
      externalSignal?.removeEventListener('abort', abort)
    }
  }
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

function parseModels(body: OpenAiModelsResponse): ModelInfo[] {
  if (!Array.isArray(body.data)) return []
  return body.data
    .filter((entry): entry is { id: string; owned_by?: unknown } => typeof entry.id === 'string')
    .map((entry) => ({
      id: entry.id,
      ownedBy: typeof entry.owned_by === 'string' ? entry.owned_by : undefined
    }))
}
