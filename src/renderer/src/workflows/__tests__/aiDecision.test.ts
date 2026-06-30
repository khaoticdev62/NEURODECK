import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { requestAiDecision } from '../aiDecision'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function stubCompletion(content: string): void {
  stubBridge({
    modelProviders: {
      complete: vi.fn().mockResolvedValue({
        ok: true,
        data: { providerId: 'p1', providerName: 'Provider', modelId: 'm1', content }
      })
    } as never
  })
}

describe('requestAiDecision', () => {
  it('parses a real strict-JSON proceed decision', async () => {
    stubCompletion('{"proceed": true, "reason": "Looks safe"}')

    const result = await requestAiDecision('Should we continue?', { branch: 'main' })

    expect(result).toEqual({ ok: true, data: { proceed: true, reason: 'Looks safe' } })
  })

  it('parses a real strict-JSON stop decision', async () => {
    stubCompletion('{"proceed": false, "reason": "Too risky"}')

    const result = await requestAiDecision('Should we continue?', {})

    expect(result).toEqual({ ok: true, data: { proceed: false, reason: 'Too risky' } })
  })

  it('strips markdown fences the model sometimes wraps JSON in', async () => {
    stubCompletion('```json\n{"proceed": true, "reason": "ok"}\n```')

    const result = await requestAiDecision('Decide', {})

    expect(result).toEqual({ ok: true, data: { proceed: true, reason: 'ok' } })
  })

  it('fails honestly when the model returns invalid JSON', async () => {
    stubCompletion('not json at all')

    const result = await requestAiDecision('Decide', {})

    expect(result.ok).toBe(false)
  })

  it('fails honestly when the model returns JSON in an unexpected shape', async () => {
    stubCompletion('{"answer": "yes"}')

    const result = await requestAiDecision('Decide', {})

    expect(result.ok).toBe(false)
  })

  it('propagates a real completion failure', async () => {
    stubBridge({
      modelProviders: {
        complete: vi
          .fn()
          .mockResolvedValue({ ok: false, error: { userMessage: 'No provider configured' } })
      } as never
    })

    const result = await requestAiDecision('Decide', {})

    expect(result).toEqual({ ok: false, error: 'No provider configured' })
  })
})
