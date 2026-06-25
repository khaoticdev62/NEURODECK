import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:process'
import { _electron as electron, type ElectronApplication } from '@playwright/test'

export interface LaunchedApp {
  app: ElectronApplication
  userDataDir: string
  close: () => Promise<void>
}

/**
 * Launches the production build against a fresh, isolated `--user-data-dir`
 * rather than this machine's real NeuroDeck profile. Real bug found while
 * building this e2e suite: without isolation, a developer's actual
 * persisted workspace made boot hang past the 15s timeout on this machine
 * (confirmed: the identical build boots in ~1s against a clean profile) —
 * every e2e spec needs a clean profile to be hermetic regardless of that
 * separately-tracked product question.
 */
export async function launchApp(): Promise<LaunchedApp> {
  const env: Record<string, string | undefined> = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE

  const userDataDir = mkdtempSync(join(tmpdir(), 'ndx-e2e-'))
  const app = await electron.launch({
    args: ['out/main/index.js', `--user-data-dir=${userDataDir}`],
    env: env as Record<string, string>
  })

  return {
    app,
    userDataDir,
    close: async () => {
      // `app.close()` alone left orphaned `electron.exe` processes behind
      // on this machine (confirmed via `tasklist` after a full suite run),
      // which then starved a subsequent test's launch of PTY/window
      // resources and made it hang for the full 30s test timeout. Killing
      // the real OS process directly, not just asking Electron to quit
      // gracefully, is what actually frees those resources before the next
      // spec launches.
      const pid = app.process().pid
      await app.close().catch(() => undefined)
      if (pid) {
        try {
          if (platform === 'win32') {
            // `taskkill /T` kills the whole process tree — Electron's GPU/
            // renderer helper processes are separate PIDs from the main
            // process and survive a plain `process.kill(pid)`.
            execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
          } else {
            process.kill(pid, 'SIGKILL')
          }
        } catch {
          // Already exited — nothing left to clean up.
        }
      }
      rmSync(userDataDir, { recursive: true, force: true })
    }
  }
}
