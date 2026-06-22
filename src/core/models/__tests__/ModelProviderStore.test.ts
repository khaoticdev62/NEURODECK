import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SecretCipher } from '../SecretCipher'
import { ModelProviderStore } from '../ModelProviderStore'

/** A real, reversible (if trivial) cipher standing in for `safeStorage` in tests — never plaintext-equals-ciphertext, so a test asserting encryption happened would actually fail if it didn't. */
class FakeCipher implements SecretCipher {
  isAvailable(): boolean {
    return true
  }
  encrypt(plaintext: string): string {
    return Buffer.from(plaintext, 'utf-8').toString('base64')
  }
  decrypt(ciphertext: string): string {
    return Buffer.from(ciphertext, 'base64').toString('utf-8')
  }
}

class UnavailableCipher implements SecretCipher {
  isAvailable(): boolean {
    return false
  }
  encrypt(): string {
    throw new Error('not available')
  }
  decrypt(): string {
    throw new Error('not available')
  }
}

let dir: string
let store: ModelProviderStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-models-'))
  store = new ModelProviderStore(join(dir, 'providers.json'), new FakeCipher())
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('ModelProviderStore', () => {
  it('starts with no providers', async () => {
    expect(await store.list()).toEqual([])
  })

  it('adds a provider without an API key', async () => {
    const provider = await store.add({
      name: 'Local Ollama',
      kind: 'local-openai-compatible',
      baseUrl: 'http://localhost:11434/v1'
    })

    expect(provider.hasApiKey).toBe(false)
    expect(await store.getApiKey(provider.id)).toBeNull()
  })

  it('encrypts a real API key and never returns it from list()/add()', async () => {
    const provider = await store.add({
      name: 'Cloud Provider',
      kind: 'cloud-openai-compatible',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-real-secret-key'
    })

    expect(provider.hasApiKey).toBe(true)
    expect(JSON.stringify(provider)).not.toContain('sk-real-secret-key')

    const listed = await store.list()
    expect(JSON.stringify(listed)).not.toContain('sk-real-secret-key')

    expect(await store.getApiKey(provider.id)).toBe('sk-real-secret-key')
  })

  it('rejects adding an API key when encryption is unavailable', async () => {
    const unsafeStore = new ModelProviderStore(join(dir, 'unsafe.json'), new UnavailableCipher())

    await expect(
      unsafeStore.add({
        name: 'Cloud',
        kind: 'cloud-openai-compatible',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'secret'
      })
    ).rejects.toThrow(/not available/)
  })

  it('removes a provider', async () => {
    const provider = await store.add({
      name: 'Local',
      kind: 'local-openai-compatible',
      baseUrl: 'http://localhost:1234/v1'
    })
    await store.remove(provider.id)

    expect(await store.list()).toEqual([])
  })

  it('gets a provider by id and its base URL', async () => {
    const provider = await store.add({
      name: 'Local',
      kind: 'local-openai-compatible',
      baseUrl: 'http://localhost:1234/v1'
    })

    expect(await store.get(provider.id)).toEqual(provider)
    expect(await store.getBaseUrl(provider.id)).toBe('http://localhost:1234/v1')
  })
})
