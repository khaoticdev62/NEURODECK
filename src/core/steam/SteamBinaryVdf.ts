/**
 * Real binary VDF ("binary KeyValues") codec — the format Steam's
 * `shortcuts.vdf` uses (distinct from the plain-text VDF
 * `libraryfolders.vdf`/`appmanifest_*.acf` use, which
 * `SteamLibraryScanner.ts` already parses). This is a generic,
 * Steam-agnostic tree codec: it knows nothing about shortcuts
 * specifically, only the real documented byte-level format —
 * `SteamShortcutCodec.ts` maps the generic tree to/from
 * shortcut-specific data. Keeping these separate means the riskiest
 * part (the actual binary format) is independently round-trip
 * testable without any shortcut-domain knowledge muddying the test.
 *
 * Format (community-reverse-engineered, used by every real tool that
 * edits `shortcuts.vdf`):
 * - `0x00` <key>\0 <nested entries> `0x08`  — a nested object
 * - `0x01` <key>\0 <value>\0                — a UTF-8 string value
 * - `0x02` <key>\0 <4 bytes little-endian>  — a signed 32-bit int value
 * - `0x08`                                  — closes the most recently
 *   opened object (and, at top level, parsing simply stops at end of
 *   buffer instead, since the file has no outer wrapper of its own)
 */

export type VdfValue = string | number | VdfNode
/** An interface (not a `Record<string, VdfValue>` type alias) — TS rejects mutual circularity between two type aliases here, but accepts it through an interface's index signature. */
export interface VdfNode {
  [key: string]: VdfValue
}

const TYPE_OBJECT = 0x00
const TYPE_STRING = 0x01
const TYPE_INT32 = 0x02
const TYPE_END = 0x08

export class VdfParseError extends Error {}

export function parseBinaryVdf(buffer: Buffer): VdfNode {
  let offset = 0

  function readCString(): string {
    const start = offset
    while (offset < buffer.length && buffer[offset] !== 0) offset++
    if (offset >= buffer.length) {
      throw new VdfParseError(`Unterminated string starting at byte ${start}`)
    }
    const value = buffer.toString('utf-8', start, offset)
    offset++ // skip the null terminator
    return value
  }

  function readNode(): VdfNode {
    const node: VdfNode = {}
    while (offset < buffer.length) {
      const type = buffer[offset]
      if (type === TYPE_END) {
        offset++
        return node
      }
      offset++
      const key = readCString()
      if (type === TYPE_OBJECT) {
        node[key] = readNode()
      } else if (type === TYPE_STRING) {
        node[key] = readCString()
      } else if (type === TYPE_INT32) {
        if (offset + 4 > buffer.length) {
          throw new VdfParseError(`Truncated int32 value for key "${key}" at byte ${offset}`)
        }
        node[key] = buffer.readInt32LE(offset)
        offset += 4
      } else {
        throw new VdfParseError(
          `Unknown VDF type byte 0x${type.toString(16)} at byte ${offset - 1}`
        )
      }
    }
    // Reaching end-of-buffer here closes the implicit top-level object —
    // the real file has no enclosing wrapper of its own.
    return node
  }

  return readNode()
}

export function serializeBinaryVdf(node: VdfNode): Buffer {
  const chunks: Buffer[] = []
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string') {
      chunks.push(Buffer.from([TYPE_STRING]), cString(key), cString(value))
    } else if (typeof value === 'number') {
      const intBuffer = Buffer.alloc(4)
      intBuffer.writeInt32LE(value, 0)
      chunks.push(Buffer.from([TYPE_INT32]), cString(key), intBuffer)
    } else {
      chunks.push(
        Buffer.from([TYPE_OBJECT]),
        cString(key),
        serializeBinaryVdf(value),
        Buffer.from([TYPE_END])
      )
    }
  }
  return Buffer.concat(chunks)
}

function cString(value: string): Buffer {
  return Buffer.concat([Buffer.from(value, 'utf-8'), Buffer.from([0])])
}
