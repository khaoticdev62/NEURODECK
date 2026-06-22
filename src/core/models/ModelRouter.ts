import type {
  ModelCompletionRequest,
  ModelCompletionResult,
  ModelProvider,
  ModelRouteDecision,
  ModelRouteRequest,
  RoutingProfileId
} from '@shared/contracts/model'
import type { SystemMetricsService, SystemMetricsSnapshot } from '../system/SystemMetricsService'
import type { ModelProviderService } from './ModelProviderService'
import type { ModelProviderStore } from './ModelProviderStore'

interface Candidate {
  provider: ModelProvider
  modelId: string
  local: boolean
  score: number
}

/** Selects only providers that answer a real capability probe, then invokes the selected model. */
export class ModelRouter {
  constructor(
    private readonly store: ModelProviderStore,
    private readonly providers: ModelProviderService,
    private readonly metrics: Pick<SystemMetricsService, 'collect'>
  ) {}

  async route(request: ModelRouteRequest): Promise<ModelRouteDecision> {
    const snapshot = await this.metrics.collect()
    const configured = (await this.store.list()).filter((provider) => provider.enabled)
    const permitted = configured.filter((provider) => this.isPermitted(provider, request))
    const candidates = (
      await Promise.all(permitted.map((provider) => this.probe(provider, request, snapshot)))
    ).flat()

    if (candidates.length === 0) {
      throw new Error('No enabled, reachable model satisfies the selected routing profile.')
    }
    candidates.sort(
      (left, right) => right.score - left.score || left.modelId.localeCompare(right.modelId)
    )
    const selected = candidates[0]
    return {
      providerId: selected.provider.id,
      providerName: selected.provider.name,
      modelId: selected.modelId,
      local: selected.local,
      profileId: request.profileId,
      reasons: this.reasons(selected, request.profileId, snapshot),
      measured: measured(snapshot)
    }
  }

  async complete(
    request: ModelCompletionRequest,
    signal?: AbortSignal
  ): Promise<ModelCompletionResult> {
    const startedAt = Date.now()
    const decision = await this.route(request)
    const provider = await this.store.get(decision.providerId)
    if (!provider) throw new Error('Selected provider no longer exists.')
    const apiKey = await this.store.getApiKey(provider.id)
    const completion = await this.providers.complete(
      provider.baseUrl,
      apiKey,
      decision.modelId,
      request,
      signal
    )
    return {
      ...decision,
      content: completion.content,
      usage: completion.usage,
      durationMs: Date.now() - startedAt
    }
  }

  private isPermitted(provider: ModelProvider, request: ModelRouteRequest): boolean {
    if (request.providerId && provider.id !== request.providerId) return false
    const local = provider.kind !== 'cloud-openai-compatible'
    return !(request.workspacePrivate || privateProfile(request.profileId)) || local
  }

  private async probe(
    provider: ModelProvider,
    request: ModelRouteRequest,
    snapshot: SystemMetricsSnapshot
  ): Promise<Candidate[]> {
    const result = await this.providers.testConnection(
      provider.baseUrl,
      await this.store.getApiKey(provider.id)
    )
    if (!result.ok) return []
    const local = provider.kind !== 'cloud-openai-compatible'
    return result.models
      .filter((model) => !request.modelId || model.id === request.modelId)
      .map((model) => ({
        provider,
        modelId: model.id,
        local,
        score: profileScore(request.profileId, local, snapshot)
      }))
  }

  private reasons(
    candidate: Candidate,
    profileId: RoutingProfileId,
    snapshot: SystemMetricsSnapshot
  ): string[] {
    const reasons = ['Provider passed a real connection and model discovery check.']
    reasons.push(
      candidate.local ? 'Model processing stays on this device.' : 'Model uses a cloud endpoint.'
    )
    if (snapshot.memory.value)
      reasons.push(`Measured memory use is ${snapshot.memory.value.usagePercent.toFixed(1)}%.`)
    if (profileId === 'battery-saver' && !candidate.local)
      reasons.push('Battery Saver avoids local inference load when a cloud provider is reachable.')
    return reasons
  }
}

function privateProfile(profileId: RoutingProfileId): boolean {
  return ['local-first', 'offline', 'private-workspace', 'low-cost'].includes(profileId)
}

function profileScore(
  profileId: RoutingProfileId,
  local: boolean,
  snapshot: SystemMetricsSnapshot
): number {
  let score = 100
  if (['local-first', 'offline', 'private-workspace', 'low-cost'].includes(profileId))
    score += local ? 100 : -1000
  if (profileId === 'battery-saver') score += local ? -30 : 50
  if (profileId === 'fast-coding') score += local ? 20 : 0
  const memoryPressure = snapshot.memory.value?.usagePercent
  const thermal = snapshot.thermal.value
    ? Math.max(...snapshot.thermal.value.map((sensor) => sensor.celsius))
    : undefined
  if (local && ((memoryPressure ?? 0) >= 85 || (thermal ?? 0) >= 85)) score -= 80
  return score
}

function measured(snapshot: SystemMetricsSnapshot): ModelRouteDecision['measured'] {
  return {
    memoryUsedPercent: snapshot.memory.value?.usagePercent,
    batteryPercent: snapshot.battery.value
      ? (snapshot.battery.value.find((battery) => battery.capacityPercent !== null)
          ?.capacityPercent ?? undefined)
      : undefined,
    temperatureCelsius: snapshot.thermal.value
      ? Math.max(...snapshot.thermal.value.map((sensor) => sensor.celsius))
      : undefined
  }
}
