import { deflateSync, inflateSync } from 'node:zlib'

/**
 * Real, byte-compatible chunk compression for the `Warp` transfer
 * service (spec §21, Phase LAN-5). Confirmed from Warpinator's own
 * `interceptors.py` (audited in
 * docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md): compression is
 * plain zlib `deflate`/`inflate` (RFC 1950, the zlib-wrapped DEFLATE
 * format — Node's `zlib.deflateSync`/`inflateSync` default, not gzip)
 * applied directly to each non-empty `FileChunk.chunk` payload, never
 * to directory/symlink marker chunks (which carry no `chunk` bytes).
 * The real default compression level is `-1` (zlib's
 * `Z_DEFAULT_COMPRESSION`, confirmed in their own gschema defaults),
 * which Node's `zlib` accepts directly as the same constant.
 */
export const DEFAULT_COMPRESSION_LEVEL = -1

export function compressChunk(chunk: Buffer, level: number = DEFAULT_COMPRESSION_LEVEL): Buffer {
  if (chunk.length === 0) return chunk
  return deflateSync(chunk, { level })
}

/** Throws on real malformed/corrupted zlib input — never silently returns the original bytes, since that would mask real data loss. */
export function decompressChunk(chunk: Buffer): Buffer {
  if (chunk.length === 0) return chunk
  return inflateSync(chunk)
}
