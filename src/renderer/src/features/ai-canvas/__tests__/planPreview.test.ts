import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ModelCompletionResult, NdxBridge } from '@shared/contracts'
import { requestPlanPreview } from '../planPreview'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function completionResult(content: string): ModelCompletionResult {
  return {
    providerId: 'p1',
    providerName: 'Provider',
    modelId: 'model',
    content,
    local: true,
    profileId: 'balanced',
    usage: {},
    durationMs: 10
  }
}

describe('requestPlanPreview', () => {
  it('parses a real strict-JSON model response into a typed plan preview', async () => {
    const complete = vi.fn().mockResolvedValue({
      ok: true,
      data: completionResult(
        JSON.stringify({
          goal: 'Audit the settings screens',
          steps: ['Inspect routes', 'Run controller tests', 'Capture failures'],
          riskLevel: 'medium',
          filesEstimate: '0-5 files',
          networkRequired: false,
          reversible: true
        })
      )
    })
    stubBridge({ modelProviders: { complete } as never })

    const result = await requestPlanPreview('Audit the settings screens', 'balanced')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.goal).toBe('Audit the settings screens')
      expect(result.data.steps).toHaveLength(3)
      expect(result.data.riskLevel).toBe('medium')
    }
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'balanced', workspacePrivate: false })
    )
  })

  it('strips a markdown code fence before parsing', async () => {
    const complete = vi.fn().mockResolvedValue({
      ok: true,
      data: completionResult(
        '```json\n' +
          JSON.stringify({
            goal: 'Fence test',
            steps: ['Step one'],
            riskLevel: 'low',
            filesEstimate: 'unknown',
            networkRequired: false,
            reversible: true
          }) +
          '\n```'
      )
    })
    stubBridge({ modelProviders: { complete } as never })

    const result = await requestPlanPreview('intent', 'balanced')

    expect(result.ok).toBe(true)
  })

  it('returns an honest error when the model response is not valid JSON', async () => {
    const complete = vi.fn().mockResolvedValue({
      ok: true,
      data: completionResult('I cannot help with that.')
    })
    stubBridge({ modelProviders: { complete } as never })

    const result = await requestPlanPreview('intent', 'balanced')

    expect(result.ok).toBe(false)
  })

  it('returns an honest error when the model response does not match the plan shape', async () => {
    const complete = vi.fn().mockResolvedValue({
      ok: true,
      data: completionResult(JSON.stringify({ unexpected: 'shape' }))
    })
    stubBridge({ modelProviders: { complete } as never })

    const result = await requestPlanPreview('intent', 'balanced')

    expect(result.ok).toBe(false)
  })

  it('propagates a real completion failure', async () => {
    const complete = vi.fn().mockResolvedValue({
      ok: false,
      error: { category: 'model', code: 'model-failed', userMessage: 'No provider available.' }
    })
    stubBridge({ modelProviders: { complete } as never })

    const result = await requestPlanPreview('intent', 'balanced')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('No provider available.')
  })
})
