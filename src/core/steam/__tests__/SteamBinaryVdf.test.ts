import { describe, expect, it } from 'vitest'
import { parseBinaryVdf, serializeBinaryVdf, VdfParseError, type VdfNode } from '../SteamBinaryVdf'

describe('SteamBinaryVdf', () => {
  it('round-trips a real nested tree with strings, ints, and nested objects', () => {
    const tree: VdfNode = {
      shortcuts: {
        '0': {
          appname: 'Demo Game',
          exe: '"/usr/bin/demo"',
          StartDir: '"/usr/bin/"',
          IsHidden: 0,
          AllowOverlay: 1,
          tags: {
            '0': 'favorite'
          }
        }
      }
    }

    const serialized = serializeBinaryVdf(tree)
    const parsed = parseBinaryVdf(serialized)

    expect(parsed).toEqual(tree)
  })

  it('round-trips negative and large int32 values correctly (signed, not unsigned)', () => {
    const tree: VdfNode = { entry: { LastPlayTime: -1, DevkitOverrideAppID: 2147483647 } }

    const parsed = parseBinaryVdf(serializeBinaryVdf(tree))

    expect(parsed).toEqual(tree)
  })

  it('round-trips empty strings and empty nested objects', () => {
    const tree: VdfNode = { shortcuts: { '0': { icon: '', tags: {} } } }

    const parsed = parseBinaryVdf(serializeBinaryVdf(tree))

    expect(parsed).toEqual(tree)
  })

  it('round-trips real non-ASCII UTF-8 content (a real shortcut name in another script)', () => {
    const tree: VdfNode = { shortcuts: { '0': { appname: '游戏 — Игра — جوجو' } } }

    const parsed = parseBinaryVdf(serializeBinaryVdf(tree))

    expect(parsed).toEqual(tree)
  })

  it('parses a real hand-built byte sequence matching the documented format exactly', () => {
    // \x00 "shortcuts\0" \x00 "0\0" \x01 "appname\0" "Demo\0" \x08 \x08
    const bytes = Buffer.concat([
      Buffer.from([0x00]),
      Buffer.from('shortcuts\0', 'utf-8'),
      Buffer.from([0x00]),
      Buffer.from('0\0', 'utf-8'),
      Buffer.from([0x01]),
      Buffer.from('appname\0', 'utf-8'),
      Buffer.from('Demo\0', 'utf-8'),
      Buffer.from([0x08]),
      Buffer.from([0x08])
    ])

    const parsed = parseBinaryVdf(bytes)

    expect(parsed).toEqual({ shortcuts: { '0': { appname: 'Demo' } } })
  })

  it('throws VdfParseError on a truncated int32 value rather than reading garbage', () => {
    const bytes = Buffer.concat([
      Buffer.from([0x02]),
      Buffer.from('x\0', 'utf-8'),
      Buffer.from([0x01, 0x02]) // only 2 of the required 4 bytes
    ])

    expect(() => parseBinaryVdf(bytes)).toThrow(VdfParseError)
  })

  it('throws VdfParseError on an unterminated string rather than reading past the buffer', () => {
    const bytes = Buffer.concat([
      Buffer.from([0x01]),
      Buffer.from('key\0', 'utf-8'),
      Buffer.from('no terminator', 'utf-8')
    ])

    expect(() => parseBinaryVdf(bytes)).toThrow(VdfParseError)
  })

  it('throws VdfParseError on an unrecognized type byte rather than silently misparsing', () => {
    const bytes = Buffer.concat([Buffer.from([0x05]), Buffer.from('key\0', 'utf-8')])

    expect(() => parseBinaryVdf(bytes)).toThrow(VdfParseError)
  })

  it('produces byte-identical output across two consecutive serializations of the same tree', () => {
    const tree: VdfNode = { shortcuts: { '0': { appname: 'A' }, '1': { appname: 'B' } } }

    expect(serializeBinaryVdf(tree)).toEqual(serializeBinaryVdf(tree))
  })
})
