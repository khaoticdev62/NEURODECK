import { spawn } from 'node:child_process'
import type { ApplicationRecord, LaunchResult } from '@shared/contracts'

export interface ApplicationLauncherOptions {
  /** Opens an external URI (`steam://...`) — injected so this module stays Electron-free; `main/` provides the real `shell.openExternal`. */
  openUrl: (url: string) => Promise<void>
}

/**
 * Real application launch (supplemental spec §6.3/§6.4 "Launch/open").
 * `steam`-sourced records launch through the real `steam://rungameid/...`
 * URI handler (Steam itself owns the actual process). `flatpak`-sourced
 * records spawn the real `flatpak run <ref>` command detached — not
 * awaited, since `flatpak run` stays attached to its caller until the
 * app exits, and a launch action must return immediately. Everything
 * else (`desktop-entry`/`appimage`/`internal`/`custom`) spawns the
 * record's real `executableRef` detached the same way, so NeuroDeck
 * exiting doesn't kill the launched app. No fabricated "launched
 * successfully" — a record with no `executableRef` and no recognized
 * source honestly fails.
 */
export class ApplicationLauncher {
  constructor(private readonly options: ApplicationLauncherOptions) {}

  async launch(record: ApplicationRecord): Promise<LaunchResult> {
    if (record.source === 'steam') {
      if (!record.executableRef)
        return { launched: false, message: 'No steam:// reference recorded.' }
      await this.options.openUrl(record.executableRef)
      return { launched: true }
    }

    if (record.source === 'flatpak') {
      if (!record.executableRef) return { launched: false, message: 'No Flatpak ref recorded.' }
      return this.spawnDetached('flatpak', ['run', record.executableRef], undefined)
    }

    if (!record.executableRef) {
      return { launched: false, message: 'This application has no recorded executable.' }
    }

    return this.spawnDetached(record.executableRef, record.launchArguments, record.workingDirectory)
  }

  /**
   * `child_process.spawn()` does not throw synchronously for a missing
   * executable (ENOENT) — it returns a live `ChildProcess` and emits an
   * `'error'` event on a later tick. Resolving immediately on spawn
   * alone would report `launched: true` for a binary that doesn't
   * exist — a fabricated success. This waits a short, bounded window for
   * that error before reporting success, the same honesty standard
   * applied everywhere else in this registry.
   */
  private spawnDetached(
    executable: string,
    args: string[],
    cwd: string | undefined
  ): Promise<LaunchResult> {
    return new Promise((resolve) => {
      let child: ReturnType<typeof spawn>
      try {
        child = spawn(executable, args, { cwd, detached: true, stdio: 'ignore' })
      } catch (error) {
        resolve({
          launched: false,
          message: error instanceof Error ? error.message : String(error)
        })
        return
      }
      const pid = child.pid
      const timer = setTimeout(() => {
        child.removeAllListeners('error')
        child.unref()
        resolve({ launched: true, pid })
      }, 200)
      child.once('error', (error) => {
        clearTimeout(timer)
        resolve({ launched: false, message: error.message })
      })
    })
  }
}
