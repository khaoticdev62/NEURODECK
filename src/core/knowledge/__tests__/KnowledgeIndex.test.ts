import { describe, expect, it } from 'vitest'
import type { KnowledgeChunk } from '@shared/contracts'
import { KnowledgeIndex } from '../KnowledgeIndex'

function chunk(id: string, text: string): KnowledgeChunk {
  return { id, sourceId: 'source-1', index: 0, text }
}

describe('KnowledgeIndex', () => {
  it('scores a chunk higher when more query terms overlap', () => {
    const index = new KnowledgeIndex()
    const high = chunk('1', 'The recovery service writes a checkpoint before every file write.')
    const low = chunk('2', 'The weather today is sunny and warm.')

    expect(index.score('recovery checkpoint file write', high)).toBeGreaterThan(
      index.score('recovery checkpoint file write', low)
    )
  })

  it('gives a real bonus for an exact substring match', () => {
    const index = new KnowledgeIndex()
    const exact = chunk('1', 'The exact phrase recovery checkpoint appears here.')
    const scattered = chunk('2', 'recovery is mentioned, and separately checkpoint too.')

    expect(index.score('recovery checkpoint', exact)).toBeGreaterThan(
      index.score('recovery checkpoint', scattered)
    )
  })

  it('returns 0 for a chunk with no overlapping terms', () => {
    const index = new KnowledgeIndex()
    expect(index.score('recovery checkpoint', chunk('1', 'completely unrelated text here'))).toBe(0)
  })

  it('rank() sorts by score descending and respects maxResults', () => {
    const index = new KnowledgeIndex()
    const chunks = [
      chunk('low', 'recovery'),
      chunk('high', 'recovery checkpoint file write'),
      chunk('none', 'nothing related at all')
    ]

    const ranked = index.rank('recovery checkpoint file write', chunks, 1)

    expect(ranked).toHaveLength(1)
    expect(ranked[0].chunk.id).toBe('high')
  })

  it('rank() excludes zero-score chunks entirely', () => {
    const index = new KnowledgeIndex()
    const ranked = index.rank('recovery', [chunk('unrelated', 'nothing matches here')], 10)
    expect(ranked).toEqual([])
  })
})
