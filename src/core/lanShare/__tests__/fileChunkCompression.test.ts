import { describe, expect, it } from 'vitest'
import { compressChunk, decompressChunk } from '../grpc/fileChunkCompression'

describe('fileChunkCompression', () => {
  it('round-trips real file bytes through real zlib deflate/inflate', () => {
    const original = Buffer.from('the quick brown fox jumps over the lazy dog'.repeat(100), 'utf-8')
    const compressed = compressChunk(original)
    expect(compressed.length).toBeLessThan(original.length)
    expect(decompressChunk(compressed)).toEqual(original)
  })

  it('never compresses an empty chunk (directory/symlink marker)', () => {
    const empty = Buffer.alloc(0)
    expect(compressChunk(empty)).toBe(empty)
    expect(decompressChunk(empty)).toBe(empty)
  })

  it('throws on real corrupted compressed input rather than silently returning wrong bytes', () => {
    const corrupted = Buffer.from([1, 2, 3, 4, 5])
    expect(() => decompressChunk(corrupted)).toThrow()
  })

  it('rejects a real zlib decompression bomb instead of allocating unbounded memory', () => {
    const bomb = compressChunk(Buffer.alloc(50 * 1024 * 1024, 0))
    expect(bomb.length).toBeLessThan(1024 * 1024)
    expect(() => decompressChunk(bomb)).toThrow()
  })
})
