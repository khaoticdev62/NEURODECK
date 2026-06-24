import type { NdxResult, UpdateChannel, UpdateStatus } from '@shared/contracts'

export interface UpdateServiceDependencies {
  currentVersion: string
  channel: UpdateChannel
  feedUrl: string | undefined
  fetch: typeof fetch
}

export interface UpdateFeedEntry {
  version: string
  changelog?: string
  compatibility?: string
}

function unavailable(
  currentVersion: string,
  channel: UpdateChannel,
  reason: string
): NdxResult<UpdateStatus> {
  return {
    ok: true,
    data: {
      currentVersion,
      latestVersion: null,
      channel,
      updateAvailable: false,
      changelog: null,
      compatibility: null,
      checkEnabled: false,
      reason
    }
  }
}

export class UpdateService {
  constructor(private readonly deps: UpdateServiceDependencies) {}

  async getStatus(): Promise<NdxResult<UpdateStatus>> {
    if (!this.deps.feedUrl) {
      return unavailable(
        this.deps.currentVersion,
        this.deps.channel,
        'No update feed is configured for this installation.'
      )
    }
    return unavailable(
      this.deps.currentVersion,
      this.deps.channel,
      'Press Check for updates to query the configured feed.'
    )
  }

  async check(): Promise<NdxResult<UpdateStatus>> {
    if (!this.deps.feedUrl) {
      return unavailable(
        this.deps.currentVersion,
        this.deps.channel,
        'No update feed is configured for this installation.'
      )
    }

    try {
      const response = await this.deps.fetch(this.deps.feedUrl)
      if (!response.ok) {
        return {
          ok: false,
          error: {
            category: 'system',
            code: 'update-check-failed',
            message: `Update feed returned ${response.status}.`,
            userMessage: `Could not reach the update feed (HTTP ${response.status}).`,
            retryable: true,
            correlationId: `upd-${Date.now()}`
          }
        }
      }
      const entry = (await response.json()) as UpdateFeedEntry
      const latestVersion = entry.version ?? null
      const updateAvailable = latestVersion !== null && latestVersion !== this.deps.currentVersion
      return {
        ok: true,
        data: {
          currentVersion: this.deps.currentVersion,
          latestVersion,
          channel: this.deps.channel,
          updateAvailable,
          changelog: entry.changelog ?? null,
          compatibility: entry.compatibility ?? null,
          checkEnabled: true,
          reason: updateAvailable ? 'An update is available.' : 'You are on the latest version.'
        }
      }
    } catch (error) {
      return {
        ok: false,
        error: {
          category: 'system',
          code: 'update-check-failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          userMessage: 'Could not check for updates. The feed may be unreachable.',
          retryable: true,
          correlationId: `upd-${Date.now()}`
        }
      }
    }
  }
}
