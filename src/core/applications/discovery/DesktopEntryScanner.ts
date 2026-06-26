import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { UpsertApplicationRequest } from '@shared/contracts'

/**
 * Real `.desktop` file discovery (supplemental spec §6.1 "Desktop files" /
 * "System packages with launchable desktop entries"). Parses the actual
 * freedesktop.org Desktop Entry `[Desktop Entry]` INI format — no
 * fabricated entries. `NoDisplay=true`/`Hidden=true` entries (helper
 * entries not meant to appear in a launcher) are real signals this
 * scanner honors by skipping them, the same way a real desktop
 * environment's app menu would.
 */
export class DesktopEntryScanner {
  constructor(private readonly directories: string[]) {}

  async scan(): Promise<UpsertApplicationRequest[]> {
    const results: UpsertApplicationRequest[] = []
    for (const directory of this.directories) {
      let entries: string[]
      try {
        entries = (await readdir(directory)).filter((name) => name.endsWith('.desktop'))
      } catch {
        // Directory doesn't exist on this system — an honest, expected
        // outcome on non-Linux platforms or a minimal install, not an error.
        continue
      }
      for (const entry of entries) {
        try {
          const raw = await readFile(join(directory, entry), 'utf-8')
          const record = parseDesktopEntry(raw, entry)
          if (record) results.push(record)
        } catch {
          // A single malformed/unreadable entry must not abort the whole scan.
        }
      }
    }
    return results
  }
}

function parseDesktopEntry(raw: string, fileName: string): UpsertApplicationRequest | null {
  const fields = new Map<string, string>()
  let inSection = false
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || trimmed.length === 0) continue
    if (trimmed.startsWith('[')) {
      inSection = trimmed === '[Desktop Entry]'
      continue
    }
    if (!inSection) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    fields.set(trimmed.slice(0, separator).trim(), trimmed.slice(separator + 1).trim())
  }

  if (fields.get('NoDisplay') === 'true' || fields.get('Hidden') === 'true') return null
  if (fields.get('Type') !== 'Application') return null
  const name = fields.get('Name')
  const exec = fields.get('Exec')
  if (!name || !exec) return null

  // `Exec` may carry field codes (`%f`, `%U`, etc.) and quoting — the
  // executable is the first whitespace-separated token; the rest are
  // real launch arguments, field codes included verbatim (a real
  // launcher substitutes them at launch time; this scanner only records
  // what the entry actually says).
  const tokens = exec.match(/(?:"[^"]*"|\S)+/g) ?? []
  const [executableRef, ...launchArguments] = tokens.map((token) => token.replace(/^"|"$/g, ''))

  return {
    id: `desktop-entry:${fileName}`,
    source: 'desktop-entry',
    name,
    description: fields.get('Comment'),
    iconRef: fields.get('Icon'),
    executableRef,
    launchArguments,
    categories: (fields.get('Categories') ?? '').split(';').filter(Boolean),
    installed: true,
    workspaceIds: [],
    launchMode: 'windowed',
    capabilityRequirements: []
  }
}
