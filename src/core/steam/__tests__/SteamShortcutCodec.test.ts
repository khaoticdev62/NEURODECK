import { describe, expect, it } from 'vitest'
import { parseBinaryVdf, serializeBinaryVdf, type VdfNode } from '../SteamBinaryVdf'
import {
  buildShortcutsTree,
  parseShortcutsTree,
  type SteamShortcutEntry
} from '../SteamShortcutCodec'

const REALISTIC_TREE: VdfNode = {
  shortcuts: {
    '0': {
      appname: 'Demo Game',
      exe: '"/usr/bin/demo"',
      StartDir: '"/usr/bin/"',
      icon: '/usr/share/icons/demo.png',
      ShortcutPath: '',
      LaunchOptions: '--fullscreen',
      IsHidden: 0,
      AllowDesktopConfig: 1,
      AllowOverlay: 1,
      OpenVR: 0,
      Devkit: 0,
      DevkitGameID: '',
      DevkitOverrideAppID: 0,
      LastPlayTime: 1700000000,
      FlatpakAppID: '',
      tags: { '0': 'favorite', '1': 'co-op' }
    }
  }
}

describe('parseShortcutsTree', () => {
  it('parses every real field from a realistic shortcuts.vdf tree', () => {
    const { entries } = parseShortcutsTree(REALISTIC_TREE)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      appName: 'Demo Game',
      exe: '"/usr/bin/demo"',
      startDir: '"/usr/bin/"',
      launchOptions: '--fullscreen',
      isHidden: false,
      allowOverlay: true,
      lastPlayTime: 1700000000,
      tags: ['favorite', 'co-op']
    })
  })

  it('returns no entries for a tree with no real "shortcuts" key', () => {
    const { entries, rawNodes } = parseShortcutsTree({ somethingElse: {} })
    expect(entries).toEqual([])
    expect(rawNodes).toEqual([])
  })

  it('matches Steam-style mixed-case keys case-insensitively', () => {
    const tree: VdfNode = { Shortcuts: { '0': { AppName: 'X', EXE: 'y' } } }
    const { entries } = parseShortcutsTree(tree)
    expect(entries[0].appName).toBe('X')
    expect(entries[0].exe).toBe('y')
  })
})

describe('buildShortcutsTree', () => {
  it('preserves every unknown/unmodeled field when editing an existing entry', () => {
    const treeWithExtraField: VdfNode = {
      shortcuts: {
        '0': {
          appname: 'Demo Game',
          exe: '"/usr/bin/demo"',
          // A real field this codec does not model, simulating a future
          // Steam client field or a value set by a different tool.
          SomeFutureField: 'must-survive',
          tags: {}
        }
      }
    }
    const { entries, rawNodes } = parseShortcutsTree(treeWithExtraField)

    const edited: SteamShortcutEntry[] = [{ ...entries[0], appName: 'Renamed Game' }]
    const rebuilt = buildShortcutsTree(edited, rawNodes)

    const rebuiltEntry = rebuilt.shortcuts as VdfNode
    const entry0 = rebuiltEntry['0'] as VdfNode
    expect(entry0.appname).toBe('Renamed Game')
    expect(entry0.SomeFutureField).toBe('must-survive')
  })

  it('round-trips parse -> build -> parse to the same real entry data', () => {
    const { entries, rawNodes } = parseShortcutsTree(REALISTIC_TREE)

    const rebuiltTree = buildShortcutsTree(entries, rawNodes)
    const reparsed = parseShortcutsTree(rebuiltTree)

    expect(reparsed.entries).toEqual(entries)
  })

  it('round-trips through the real binary codec end to end (parse bytes -> entries -> bytes -> entries)', () => {
    const originalBytes = serializeBinaryVdf(REALISTIC_TREE)
    const { entries, rawNodes } = parseShortcutsTree(parseBinaryVdf(originalBytes))

    const rebuiltBytes = serializeBinaryVdf(buildShortcutsTree(entries, rawNodes))
    const finalEntries = parseShortcutsTree(parseBinaryVdf(rebuiltBytes)).entries

    expect(finalEntries).toEqual(entries)
  })

  it('builds a real default field set for a brand-new entry with no raw node', () => {
    const created: SteamShortcutEntry = {
      index: 0,
      appName: 'New Shortcut',
      exe: '"/usr/bin/new"',
      startDir: '',
      icon: '',
      shortcutPath: '',
      launchOptions: '',
      isHidden: false,
      allowDesktopConfig: true,
      allowOverlay: true,
      openVR: false,
      devkit: false,
      devkitGameId: '',
      devkitOverrideAppId: 0,
      lastPlayTime: 0,
      flatpakAppId: '',
      tags: []
    }

    const tree = buildShortcutsTree([created], [])
    const { entries } = parseShortcutsTree(tree)

    expect(entries[0]).toEqual(created)
  })

  it('re-derives sequential index positions after a removal', () => {
    const tree: VdfNode = {
      shortcuts: {
        '0': { appname: 'First', exe: 'a', tags: {} },
        '1': { appname: 'Second', exe: 'b', tags: {} },
        '2': { appname: 'Third', exe: 'c', tags: {} }
      }
    }
    const { entries, rawNodes } = parseShortcutsTree(tree)
    const afterRemovingSecond = entries.filter((entry) => entry.appName !== 'Second')

    const rebuilt = buildShortcutsTree(afterRemovingSecond, rawNodes)
    const { entries: finalEntries } = parseShortcutsTree(rebuilt)

    expect(finalEntries.map((entry) => entry.appName)).toEqual(['First', 'Third'])
    expect(finalEntries.map((entry) => entry.index)).toEqual([0, 1])
  })
})
