import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

/** Real default Steam install root per platform — the same convention `defaultLibraryFoldersVdfPath` already uses, callers may always override with a real, already-known path instead. */
export function defaultSteamRoot(homeDir: string, platform: NodeJS.Platform): string {
  if (platform === 'win32') {
    return join('C:', 'Program Files (x86)', 'Steam')
  }
  return join(homeDir, '.steam', 'steam')
}

/**
 * Real discovery of every local Steam user profile's `shortcuts.vdf`
 * path. A machine can have multiple Steam accounts that have ever
 * logged in (`userdata/<id>/`), and this app must never silently
 * guess which one is "the" user — every real candidate is returned
 * so the UI can let the person pick explicitly. A user profile with
 * no non-Steam shortcuts yet has no `shortcuts.vdf` file at all yet,
 * which is itself a real, valid state (an empty list), not an error.
 */
export async function discoverShortcutsVdfPaths(steamRoot: string): Promise<string[]> {
  const userdataDir = join(steamRoot, 'userdata')
  let entries: string[]
  try {
    entries = await readdir(userdataDir)
  } catch {
    return []
  }
  return entries
    .filter((entry) => /^\d+$/.test(entry))
    .map((userId) => join(userdataDir, userId, 'config', 'shortcuts.vdf'))
}
