import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GitFileChange, NdxBridge } from '@shared/contracts'
import { requestCommitMessageSuggestion } from '../gitCommitMessage'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const staged: GitFileChange[] = [
  { path: 'src/a.ts', status: 'M.', staged: true },
  { path: 'src/b.ts', status: 'A.', staged: true }
]

describe('requestCommitMessageSuggestion', () => {
  it('fails honestly when nothing is staged', async () => {
    const result = await requestCommitMessageSuggestion('w1', [])
    expect(result).toEqual({
      ok: false,
      error: 'Stage at least one change before requesting a suggestion.'
    })
  })

  it('fetches the real diff for each staged file and sends it to the model', async () => {
    const getDiff = vi.fn().mockResolvedValue({ ok: true, data: { diff: '+added line' } })
    const complete = vi.fn().mockResolvedValue({ ok: true, data: { content: 'feat: add a and b' } })
    stubBridge({
      git: { diff: getDiff } as never,
      modelProviders: { complete } as never
    })

    const result = await requestCommitMessageSuggestion('w1', staged)

    expect(result).toEqual({ ok: true, data: 'feat: add a and b' })
    expect(getDiff).toHaveBeenCalledWith({ workspaceId: 'w1', path: 'src/a.ts', staged: true })
    expect(getDiff).toHaveBeenCalledWith({ workspaceId: 'w1', path: 'src/b.ts', staged: true })
    const sentContent = complete.mock.calls[0][0].messages[1].content as string
    expect(sentContent).toContain('src/a.ts')
    expect(sentContent).toContain('+added line')
  })

  it('caps the number of files included and notes how many were omitted', async () => {
    const manyStaged: GitFileChange[] = Array.from({ length: 15 }, (_, index) => ({
      path: `file-${index}.ts`,
      status: 'M.',
      staged: true
    }))
    const getDiff = vi.fn().mockResolvedValue({ ok: true, data: { diff: 'x' } })
    const complete = vi.fn().mockResolvedValue({ ok: true, data: { content: 'chore: update' } })
    stubBridge({ git: { diff: getDiff } as never, modelProviders: { complete } as never })

    await requestCommitMessageSuggestion('w1', manyStaged)

    expect(getDiff).toHaveBeenCalledTimes(10)
    const sentContent = complete.mock.calls[0][0].messages[1].content as string
    expect(sentContent).toContain('5 additional staged file(s) not shown')
  })

  it('fails honestly when the model returns an empty message', async () => {
    stubBridge({
      git: { diff: vi.fn().mockResolvedValue({ ok: true, data: { diff: 'x' } }) } as never,
      modelProviders: {
        complete: vi.fn().mockResolvedValue({ ok: true, data: { content: '   ' } })
      } as never
    })

    const result = await requestCommitMessageSuggestion('w1', staged)

    expect(result).toEqual({ ok: false, error: 'The model returned an empty commit message.' })
  })

  it('propagates a real completion failure', async () => {
    stubBridge({
      git: { diff: vi.fn().mockResolvedValue({ ok: true, data: { diff: 'x' } }) } as never,
      modelProviders: {
        complete: vi.fn().mockResolvedValue({ ok: false, error: { userMessage: 'No provider' } })
      } as never
    })

    const result = await requestCommitMessageSuggestion('w1', staged)

    expect(result).toEqual({ ok: false, error: 'No provider' })
  })
})
