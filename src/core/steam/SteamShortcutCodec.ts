import type { VdfNode, VdfValue } from './SteamBinaryVdf'

/**
 * Real domain mapping between `shortcuts.vdf`'s generic binary-VDF
 * tree and a typed `SteamShortcutEntry`. The single most important
 * safety property here: editing or removing one shortcut must never
 * silently drop fields this codec doesn't know about (a future Steam
 * client version, a field set by a different tool, etc.). Every
 * parsed entry keeps its original raw node; writes start from a
 * clone of that raw node and only overlay the fields the caller
 * actually changed, rather than reconstructing the entry from
 * scratch. Brand-new entries (no raw node yet) use the documented
 * default field set.
 */
export interface SteamShortcutEntry {
  /** The real numeric position in `shortcuts.vdf`'s "shortcuts" map, re-derived as sequential string keys on every write — never trust a stale index across edits. */
  index: number
  appName: string
  exe: string
  startDir: string
  icon: string
  shortcutPath: string
  launchOptions: string
  isHidden: boolean
  allowDesktopConfig: boolean
  allowOverlay: boolean
  openVR: boolean
  devkit: boolean
  devkitGameId: string
  devkitOverrideAppId: number
  lastPlayTime: number
  flatpakAppId: string
  tags: string[]
}

const DEFAULT_ENTRY_FIELDS: Omit<SteamShortcutEntry, 'index' | 'appName' | 'exe'> = {
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

function findKey(node: VdfNode, name: string): string | undefined {
  return Object.keys(node).find((key) => key.toLowerCase() === name.toLowerCase())
}

function stringField(node: VdfNode, name: string, fallback: string): string {
  const key = findKey(node, name)
  const value = key ? node[key] : undefined
  return typeof value === 'string' ? value : fallback
}

function intField(node: VdfNode, name: string, fallback: number): number {
  const key = findKey(node, name)
  const value = key ? node[key] : undefined
  return typeof value === 'number' ? value : fallback
}

function boolField(node: VdfNode, name: string, fallback: boolean): boolean {
  const key = findKey(node, name)
  const value = key ? node[key] : undefined
  return typeof value === 'number' ? value !== 0 : fallback
}

function tagsField(node: VdfNode, name: string): string[] {
  const key = findKey(node, name)
  const value = key ? node[key] : undefined
  if (!value || typeof value !== 'object') return []
  return Object.values(value).filter((entry): entry is string => typeof entry === 'string')
}

/** Real parse: `shortcuts.vdf`'s root node maps numeric string keys ("0", "1", ...) to per-shortcut nodes under a top-level "shortcuts" key. */
export function parseShortcutsTree(root: VdfNode): {
  entries: SteamShortcutEntry[]
  rawNodes: VdfNode[]
} {
  const shortcutsKey = findKey(root, 'shortcuts')
  const shortcutsNode = shortcutsKey ? root[shortcutsKey] : undefined
  if (!shortcutsNode || typeof shortcutsNode !== 'object') {
    return { entries: [], rawNodes: [] }
  }

  const rawNodes = Object.values(shortcutsNode).filter(
    (value): value is VdfNode => typeof value === 'object'
  )

  const entries = rawNodes.map((node, index) => ({
    index,
    appName: stringField(node, 'appname', ''),
    exe: stringField(node, 'exe', ''),
    startDir: stringField(node, 'StartDir', DEFAULT_ENTRY_FIELDS.startDir),
    icon: stringField(node, 'icon', DEFAULT_ENTRY_FIELDS.icon),
    shortcutPath: stringField(node, 'ShortcutPath', DEFAULT_ENTRY_FIELDS.shortcutPath),
    launchOptions: stringField(node, 'LaunchOptions', DEFAULT_ENTRY_FIELDS.launchOptions),
    isHidden: boolField(node, 'IsHidden', DEFAULT_ENTRY_FIELDS.isHidden),
    allowDesktopConfig: boolField(
      node,
      'AllowDesktopConfig',
      DEFAULT_ENTRY_FIELDS.allowDesktopConfig
    ),
    allowOverlay: boolField(node, 'AllowOverlay', DEFAULT_ENTRY_FIELDS.allowOverlay),
    openVR: boolField(node, 'OpenVR', DEFAULT_ENTRY_FIELDS.openVR),
    devkit: boolField(node, 'Devkit', DEFAULT_ENTRY_FIELDS.devkit),
    devkitGameId: stringField(node, 'DevkitGameID', DEFAULT_ENTRY_FIELDS.devkitGameId),
    devkitOverrideAppId: intField(
      node,
      'DevkitOverrideAppID',
      DEFAULT_ENTRY_FIELDS.devkitOverrideAppId
    ),
    lastPlayTime: intField(node, 'LastPlayTime', DEFAULT_ENTRY_FIELDS.lastPlayTime),
    flatpakAppId: stringField(node, 'FlatpakAppID', DEFAULT_ENTRY_FIELDS.flatpakAppId),
    tags: tagsField(node, 'tags')
  }))

  return { entries, rawNodes }
}

/**
 * Real write path. `rawNodes[i]` (when present, i.e. an existing
 * entry being edited) is cloned and only the real changed fields are
 * overlaid — every other field that node already had (including ones
 * this codec doesn't model) survives untouched. A brand-new entry
 * (no corresponding raw node) gets the documented default field set.
 */
export function buildShortcutsTree(entries: SteamShortcutEntry[], rawNodes: VdfNode[]): VdfNode {
  const shortcuts: VdfNode = {}
  entries.forEach((entry, position) => {
    const existing = rawNodes[entry.index]
    const node: VdfNode = existing ? { ...existing } : {}
    setField(node, existing, 'appname', entry.appName)
    setField(node, existing, 'exe', entry.exe)
    setField(node, existing, 'StartDir', entry.startDir)
    setField(node, existing, 'icon', entry.icon)
    setField(node, existing, 'ShortcutPath', entry.shortcutPath)
    setField(node, existing, 'LaunchOptions', entry.launchOptions)
    setField(node, existing, 'IsHidden', entry.isHidden ? 1 : 0)
    setField(node, existing, 'AllowDesktopConfig', entry.allowDesktopConfig ? 1 : 0)
    setField(node, existing, 'AllowOverlay', entry.allowOverlay ? 1 : 0)
    setField(node, existing, 'OpenVR', entry.openVR ? 1 : 0)
    setField(node, existing, 'Devkit', entry.devkit ? 1 : 0)
    setField(node, existing, 'DevkitGameID', entry.devkitGameId)
    setField(node, existing, 'DevkitOverrideAppID', entry.devkitOverrideAppId)
    setField(node, existing, 'LastPlayTime', entry.lastPlayTime)
    setField(node, existing, 'FlatpakAppID', entry.flatpakAppId)
    const tagsNode: VdfNode = {}
    entry.tags.forEach((tag, tagIndex) => {
      tagsNode[String(tagIndex)] = tag
    })
    node[findKey(node, 'tags') ?? 'tags'] = tagsNode
    shortcuts[String(position)] = node
  })
  return { shortcuts }
}

function setField(
  node: VdfNode,
  existing: VdfNode | undefined,
  name: string,
  value: VdfValue
): void {
  const key = (existing && findKey(existing, name)) ?? name
  node[key] = value
}
