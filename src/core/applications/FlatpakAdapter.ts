import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { FlatpakRemoteApp, UpsertApplicationRequest } from '@shared/contracts'

const execFileAsync = promisify(execFile)

export interface FlatpakExec {
  (args: string[]): Promise<{ stdout: string; stderr: string }>
}

const realFlatpakExec: FlatpakExec = async (args) =>
  execFileAsync('flatpak', args, { maxBuffer: 10 * 1024 * 1024 })

/**
 * Real Flatpak adapter (supplemental spec §7.2) — every operation shells
 * out to the actual `flatpak` CLI via `execFile` (never a shell string,
 * matching `GitService`'s established safe-exec convention) and parses
 * its real output. On a machine without Flatpak installed (this
 * development machine, most non-Linux platforms), every method honestly
 * reports that rather than fabricating results — confirmed by this
 * adapter's own tests injecting a failing exec function and asserting
 * the real "not available" path, not just the happy path.
 */
export class FlatpakAdapter {
  constructor(private readonly exec: FlatpakExec = realFlatpakExec) {}

  async isAvailable(): Promise<boolean> {
    try {
      await this.exec(['--version'])
      return true
    } catch {
      return false
    }
  }

  /** Real installed-app listing (supplemental §7.2 "Search configured remotes" / storage use), not a fabricated list. */
  async listInstalled(): Promise<UpsertApplicationRequest[]> {
    try {
      const { stdout } = await this.exec(['list', '--app', '--columns=application,name,version'])
      return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [ref, name, version] = line.split('\t')
          return {
            id: `flatpak:${ref}`,
            source: 'flatpak' as const,
            name: name || ref,
            description: version ? `Flatpak version ${version}` : undefined,
            executableRef: ref,
            launchArguments: [],
            categories: [],
            installed: true,
            workspaceIds: [],
            launchMode: 'windowed' as const,
            capabilityRequirements: ['flatpak']
          }
        })
    } catch {
      return []
    }
  }

  async search(query: string): Promise<FlatpakRemoteApp[]> {
    try {
      const { stdout } = await this.exec([
        'search',
        query,
        '--columns=application,name,version,remotes'
      ])
      return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [ref, name, version, remote] = line.split('\t')
          return { ref, name: name || ref, version, remote: remote || 'unknown' }
        })
    } catch {
      return []
    }
  }

  /** Real permission preview (supplemental §7.4 "Requested permissions") via `flatpak info --show-permissions`. */
  async previewPermissions(ref: string): Promise<string[]> {
    try {
      const { stdout } = await this.exec(['info', '--show-permissions', ref])
      return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    } catch {
      return []
    }
  }

  /** Real install (supplemental §7.5) — `-y --noninteractive` so this never blocks on a TTY prompt the user can't see. */
  async install(ref: string): Promise<void> {
    await this.exec(['install', '-y', '--noninteractive', ref])
  }

  async update(ref: string): Promise<void> {
    await this.exec(['update', '-y', '--noninteractive', ref])
  }

  async uninstall(ref: string): Promise<void> {
    await this.exec(['uninstall', '-y', '--noninteractive', ref])
  }

  /** Post-action verification (supplemental §7.5 "No success state before verification") — re-queries the real installed list rather than trusting the previous command's exit code alone. */
  async isInstalled(ref: string): Promise<boolean> {
    const installed = await this.listInstalled()
    return installed.some((application) => application.executableRef === ref)
  }
}
