import { describe, expect, it } from 'vitest'
import { UpdateService, type UpdateServiceDependencies } from '../UpdateService'

describe('UpdateService', () => {
  it('reports checking disabled when no feed URL is configured', async () => {
    const service = new UpdateService(fakeDependencies({ feedUrl: undefined }))

    const result = await service.getStatus()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.currentVersion).toBe('0.0.0')
    expect(result.data.checkEnabled).toBe(false)
    expect(result.data.reason).toContain('No update feed is configured')
  })

  it('check() also reports disabled when no feed URL is configured', async () => {
    const service = new UpdateService(fakeDependencies({ feedUrl: undefined }))

    const result = await service.check()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.checkEnabled).toBe(false)
    expect(result.data.reason).toContain('No update feed is configured')
  })

  it('detects an available update when the feed reports a newer version', async () => {
    const fetch = fakeFetch({
      version: '0.1.0',
      changelog: 'New features.',
      compatibility: 'compatible'
    })
    const service = new UpdateService(
      fakeDependencies({ feedUrl: 'https://example.com/feed.json', fetch })
    )

    const result = await service.check()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.updateAvailable).toBe(true)
    expect(result.data.latestVersion).toBe('0.1.0')
    expect(result.data.changelog).toBe('New features.')
    expect(result.data.compatibility).toBe('compatible')
    expect(result.data.checkEnabled).toBe(true)
  })

  it('reports up-to-date when the feed version matches the current version', async () => {
    const fetch = fakeFetch({ version: '0.0.0' })
    const service = new UpdateService(
      fakeDependencies({ currentVersion: '0.0.0', feedUrl: 'https://example.com/feed.json', fetch })
    )

    const result = await service.check()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.updateAvailable).toBe(false)
    expect(result.data.latestVersion).toBe('0.0.0')
    expect(result.data.reason).toContain('latest version')
  })

  it('returns a retryable error when the feed request fails', async () => {
    const fetch = async (): Promise<Response> => {
      throw new Error('net::ERR_INTERNET_DISCONNECTED')
    }
    const service = new UpdateService(
      fakeDependencies({ feedUrl: 'https://example.com/feed.json', fetch })
    )

    const result = await service.check()

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('update-check-failed')
    expect(result.error.retryable).toBe(true)
  })

  it('returns a retryable error when the feed responds with a non-OK status', async () => {
    const fetch = async (): Promise<Response> =>
      ({ ok: false, status: 503, json: async () => undefined }) as unknown as Response
    const service = new UpdateService(
      fakeDependencies({ feedUrl: 'https://example.com/feed.json', fetch })
    )

    const result = await service.check()

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('update-check-failed')
    expect(result.error.userMessage).toContain('503')
  })
})

function fakeDependencies(
  overrides: Partial<UpdateServiceDependencies> = {}
): UpdateServiceDependencies {
  return {
    currentVersion: '0.0.0',
    channel: 'stable',
    feedUrl: undefined,
    fetch: fakeFetch({ version: '0.0.0' }),
    ...overrides
  }
}

function fakeFetch(entry: {
  version: string
  changelog?: string
  compatibility?: string
}): typeof fetch {
  return async (): Promise<Response> =>
    ({
      ok: true,
      status: 200,
      json: async () => entry
    }) as unknown as Response
}
