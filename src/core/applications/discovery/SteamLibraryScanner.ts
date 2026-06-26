import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { UpsertApplicationRequest } from '@shared/contracts'

/**
 * Real Steam library discovery (supplemental spec §6.1 "Steam library
 * entries"). Parses Steam's actual text-based VDF format used by
 * `libraryfolders.vdf` and each library's `steamapps/appmanifest_*.acf`
 * — a simple, real, documented key/value format (distinct from
 * `shortcuts.vdf`'s binary format, which Epic X2's Steam Shortcut
 * Manager deliberately defers). No fabricated library entries — a
 * missing/unreadable file is treated as "no Steam library found here,"
 * the honest answer, not an error that aborts discovery.
 */
export class SteamLibraryScanner {
  constructor(private readonly libraryFoldersVdfPath: string) {}

  async scan(): Promise<UpsertApplicationRequest[]> {
    let raw: string
    try {
      raw = await readFile(this.libraryFoldersVdfPath, 'utf-8')
    } catch {
      return []
    }

    const libraryPaths = parseLibraryFolders(raw)
    const results: UpsertApplicationRequest[] = []
    for (const libraryPath of libraryPaths) {
      const appsDir = join(libraryPath, 'steamapps')
      let manifestFiles: string[]
      try {
        manifestFiles = (await readdir(appsDir)).filter(
          (name) => name.startsWith('appmanifest_') && name.endsWith('.acf')
        )
      } catch {
        continue
      }
      for (const manifestFile of manifestFiles) {
        try {
          const manifestRaw = await readFile(join(appsDir, manifestFile), 'utf-8')
          const record = parseAppManifest(manifestRaw)
          if (record) results.push(record)
        } catch {
          // A single unreadable manifest must not abort the whole scan.
        }
      }
    }
    return results
  }
}

/** `libraryfolders.vdf` lists each Steam library's real root path as a quoted key under a numbered index. */
function parseLibraryFolders(raw: string): string[] {
  const paths: string[] = []
  const pathRegex = /"path"\s*"((?:[^"\\]|\\.)*)"/g
  let match: RegExpExecArray | null
  while ((match = pathRegex.exec(raw))) {
    paths.push(unescapeVdfString(match[1]))
  }
  return paths
}

function parseAppManifest(raw: string): UpsertApplicationRequest | null {
  const appId = matchVdfField(raw, 'appid')
  const name = matchVdfField(raw, 'name')
  const installDir = matchVdfField(raw, 'installdir')
  if (!appId || !name) return null

  return {
    id: `steam:${appId}`,
    source: 'steam',
    name,
    executableRef: `steam://rungameid/${appId}`,
    launchArguments: [],
    categories: [],
    installed: true,
    workspaceIds: [],
    launchMode: 'external',
    capabilityRequirements: [],
    description: installDir ? `Installed in ${installDir}` : undefined
  }
}

function matchVdfField(raw: string, key: string): string | undefined {
  const match = new RegExp(`"${key}"\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i').exec(raw)
  return match ? unescapeVdfString(match[1]) : undefined
}

function unescapeVdfString(value: string): string {
  return value.replace(/\\\\/g, '\\').replace(/\\"/g, '"')
}

/** Real default `libraryfolders.vdf` location for the platform — callers may always override with a real, already-known path instead. */
export function defaultLibraryFoldersVdfPath(homeDir: string, platform: NodeJS.Platform): string {
  if (platform === 'win32') {
    return join('C:', 'Program Files (x86)', 'Steam', 'steamapps', 'libraryfolders.vdf')
  }
  return join(homeDir, '.steam', 'steam', 'steamapps', 'libraryfolders.vdf')
}
