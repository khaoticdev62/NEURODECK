import { randomUUID } from 'node:crypto'
import type { AddModelProviderRequest, ModelProvider } from '@shared/contracts/model'
import { JsonStore } from '../persistence/JsonStore'
import type { SecretCipher } from './SecretCipher'

interface StoredProvider {
  id: string
  name: string
  kind: ModelProvider['kind']
  baseUrl: string
  encryptedApiKey: string | null
  enabled?: boolean
  createdAt: number
}

interface ProviderIndex {
  providers: StoredProvider[]
}

/**
 * Real provider configuration (mega-prompt §18.3). API keys are encrypted
 * with the injected `SecretCipher` (real implementation: Electron's
 * `safeStorage`) before they ever touch disk, and are never included in
 * anything returned to the renderer — `list()`/`add()` return `ModelProvider`
 * (just `hasApiKey: boolean`); only `getApiKey()`, called exclusively from
 * `ModelProviderService` inside the main process, decrypts the real key.
 */
export class ModelProviderStore {
  private store: JsonStore<ProviderIndex>

  constructor(
    filePath: string,
    private cipher: SecretCipher
  ) {
    this.store = new JsonStore<ProviderIndex>(filePath, { providers: [] })
  }

  async list(): Promise<ModelProvider[]> {
    const index = await this.store.read()
    return index.providers.map(toPublicProvider)
  }

  async add(request: AddModelProviderRequest): Promise<ModelProvider> {
    let encryptedApiKey: string | null = null
    if (request.apiKey) {
      if (!this.cipher.isAvailable()) {
        throw new Error(
          'Secure credential storage is not available on this system — cannot save an API key.'
        )
      }
      encryptedApiKey = this.cipher.encrypt(request.apiKey)
    }

    const provider: StoredProvider = {
      id: randomUUID(),
      name: request.name,
      kind: request.kind,
      baseUrl: request.baseUrl,
      encryptedApiKey,
      enabled: true,
      createdAt: Date.now()
    }

    const index = await this.store.read()
    await this.store.write({ providers: [...index.providers, provider] })
    return toPublicProvider(provider)
  }

  async remove(providerId: string): Promise<void> {
    const index = await this.store.read()
    await this.store.write({
      providers: index.providers.filter((provider) => provider.id !== providerId)
    })
  }

  async get(providerId: string): Promise<ModelProvider | undefined> {
    const index = await this.store.read()
    const provider = index.providers.find((candidate) => candidate.id === providerId)
    return provider ? toPublicProvider(provider) : undefined
  }

  /** Decrypts the real API key — only ever called from `ModelProviderService` inside the main process, never returned over IPC. */
  async getApiKey(providerId: string): Promise<string | null> {
    const index = await this.store.read()
    const provider = index.providers.find((candidate) => candidate.id === providerId)
    if (!provider?.encryptedApiKey) return null
    return this.cipher.decrypt(provider.encryptedApiKey)
  }

  async getBaseUrl(providerId: string): Promise<string | undefined> {
    const index = await this.store.read()
    return index.providers.find((candidate) => candidate.id === providerId)?.baseUrl
  }

  async setEnabled(providerId: string, enabled: boolean): Promise<ModelProvider | undefined> {
    const index = await this.store.read()
    const provider = index.providers.find((candidate) => candidate.id === providerId)
    if (!provider) return undefined
    provider.enabled = enabled
    await this.store.write(index)
    return toPublicProvider(provider)
  }
}

function toPublicProvider(provider: StoredProvider): ModelProvider {
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    baseUrl: provider.baseUrl,
    hasApiKey: provider.encryptedApiKey !== null,
    enabled: provider.enabled !== false,
    createdAt: provider.createdAt
  }
}
