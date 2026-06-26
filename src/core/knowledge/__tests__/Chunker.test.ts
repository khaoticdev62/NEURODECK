import { describe, expect, it } from 'vitest'
import { chunkText } from '../Chunker'

describe('chunkText', () => {
  it('splits real text on paragraph boundaries when each paragraph fits', () => {
    const chunks = chunkText('First paragraph.\n\nSecond paragraph.\n\nThird paragraph.', 100, 10)
    expect(chunks).toEqual(['First paragraph.', 'Second paragraph.', 'Third paragraph.'])
  })

  it('splits an over-long paragraph into fixed-size windows with real overlap', () => {
    const longParagraph = 'a'.repeat(250)
    const chunks = chunkText(longParagraph, 100, 20)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0]).toHaveLength(100)
    // Real overlap: the end of one chunk and the start of the next share text.
    expect(chunks[0].slice(-20)).toBe(chunks[1].slice(0, 20))
  })

  it('returns the whole text as one chunk when it is short and has no paragraph breaks', () => {
    expect(chunkText('A short note.')).toEqual(['A short note.'])
  })

  it('returns an empty array for empty input', () => {
    expect(chunkText('')).toEqual([])
  })
})
