import type { LocalModelStatus, ModelBenchmarkResult } from '@shared/contracts/model'

interface OllamaPsResponse {
  models?: Array<{ name?: unknown; model?: unknown }>
}

/** Capability-detected local runtime controls for an explicitly configured Ollama provider. */
export class OllamaRuntimeService {
  async status(providerId: string, openAiBaseUrl: string): Promise<LocalModelStatus> {
    try {
      const response = await fetch(`${ollamaRoot(openAiBaseUrl)}/api/ps`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = (await response.json()) as OllamaPsResponse
      const runningModelIds = (body.models ?? []).flatMap((model) => {
        const id = typeof model.name === 'string' ? model.name : model.model
        return typeof id === 'string' ? [id] : []
      })
      return { providerId, supported: true, runningModelIds }
    } catch (error) {
      return {
        providerId,
        supported: false,
        runningModelIds: [],
        reason: error instanceof Error ? error.message : 'Ollama runtime is unavailable.'
      }
    }
  }

  async load(openAiBaseUrl: string, modelId: string): Promise<void> {
    await this.generate(openAiBaseUrl, modelId, '', -1)
  }

  async unload(openAiBaseUrl: string, modelId: string): Promise<void> {
    await this.generate(openAiBaseUrl, modelId, '', 0)
  }

  async benchmark(openAiBaseUrl: string, modelId: string): Promise<ModelBenchmarkResult> {
    const startedAt = Date.now()
    const body = await this.generate(openAiBaseUrl, modelId, 'Reply with exactly: ready', -1)
    const durationMs = Date.now() - startedAt
    const outputTokens = typeof body.eval_count === 'number' ? body.eval_count : undefined
    const evaluationNs = typeof body.eval_duration === 'number' ? body.eval_duration : undefined
    return {
      modelId,
      durationMs,
      outputTokens,
      tokensPerSecond:
        outputTokens !== undefined && evaluationNs && evaluationNs > 0
          ? outputTokens / (evaluationNs / 1_000_000_000)
          : undefined
    }
  }

  private async generate(
    openAiBaseUrl: string,
    modelId: string,
    prompt: string,
    keepAlive: number
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${ollamaRoot(openAiBaseUrl)}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId, prompt, stream: false, keep_alive: keepAlive })
    })
    if (!response.ok) throw new Error(`Ollama responded with HTTP ${response.status}.`)
    return (await response.json()) as Record<string, unknown>
  }
}

function ollamaRoot(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')
}
