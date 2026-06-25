import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp } from './helpers/launchApp'

/**
 * Proves the real `WorkspaceStore`/folder-picker round-trip, not just
 * renderer-only state: stubs the native `dialog.showOpenDialog` (in the main
 * process, via `app.evaluate`) to point at a real temp directory, then
 * confirms the workspace card survives a navigate-away-and-back — which
 * only happens if it was actually persisted, not held in a component's
 * local state.
 */
test('adds a real workspace via the folder picker and persists it across navigation', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'ndx-e2e-workspace-'))
  const { app, close } = await launchApp()

  try {
    await app.evaluate(({ dialog }, picked) => {
      dialog.showOpenDialog = (async () => ({
        canceled: false,
        filePaths: [picked]
      })) as typeof dialog.showOpenDialog
    }, tempDir)

    const window = await app.firstWindow()
    await expect(window.getByRole('banner')).toBeVisible({ timeout: 20000 })

    await window.evaluate(() => {
      window.location.hash = '/workspaces'
    })
    await expect(window).toHaveURL(/workspaces/)

    await window.getByRole('button', { name: 'Add workspace' }).click()

    const workspaceName = tempDir.split(/[\\/]/).pop() ?? tempDir
    await expect(window.getByText(workspaceName, { exact: true })).toBeVisible({ timeout: 10000 })

    await window.evaluate(() => {
      window.location.hash = '/home'
    })
    await window.evaluate(() => {
      window.location.hash = '/workspaces'
    })

    await expect(window.getByText(workspaceName, { exact: true })).toBeVisible()
  } finally {
    await close()
    rmSync(tempDir, { recursive: true, force: true })
  }
})
