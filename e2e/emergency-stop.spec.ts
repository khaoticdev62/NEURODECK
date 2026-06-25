import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp } from './helpers/launchApp'

/**
 * Proves Emergency Stop enforces at the real `ActionQueue` level, not just
 * an overlay visual: a pending action actually flips to `cancelled` (not
 * just disappears from the Approval Queue), and a second `submit()` is
 * really rejected with the queue's real "paused" error, not silently
 * swallowed.
 */
test('Emergency Stop cancels a pending action and blocks new submissions at the queue level', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'ndx-e2e-emergency-'))
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
    await window.getByRole('button', { name: 'Add workspace' }).click()
    const workspaceName = tempDir.split(/[\\/]/).pop() ?? tempDir
    await expect(window.getByText(workspaceName, { exact: true })).toBeVisible({ timeout: 10000 })

    await window.evaluate(() => {
      window.location.hash = '/terminal'
    })
    await window.getByRole('button', { name: '+ New session' }).click()
    await expect(window.getByLabel(/Terminal session/)).toBeVisible()

    // A `rm` block classifies as a high-risk command, which requires
    // approval rather than running immediately.
    await window.evaluate(() => {
      window.location.hash = '/terminal/builder'
    })
    await window.getByPlaceholder(/Executable/).fill('rm')
    await window.getByRole('button', { name: 'Add block' }).click()
    await window.getByPlaceholder(/Program operation/).fill('e2e-emergency-stop-marker.txt')
    await window.getByRole('button', { name: 'Send to approval review' }).click()
    await expect(window.getByText('REQUEST: Run destructive terminal command')).toBeVisible({
      timeout: 10000
    })

    // Trigger Emergency Stop (F1 maps to the real `emergency.stop` controller action).
    await window.keyboard.press('F1')
    await expect(window.getByText('Emergency Stop Active')).toBeVisible({ timeout: 5000 })
    await window.getByRole('button', { name: 'Keep paused' }).click()

    await window.evaluate(() => {
      window.location.hash = '/ai/timeline'
    })
    await expect(window.getByText('Cancelled')).toBeVisible({ timeout: 10000 })

    // A second submission while paused must be rejected at the queue level.
    await window.evaluate(() => {
      window.location.hash = '/terminal/builder'
    })
    await window.getByPlaceholder(/Executable/).fill('echo')
    await window.getByRole('button', { name: 'Add block' }).click()
    await window.getByPlaceholder(/Program operation/).fill('should-not-run')
    await window.getByRole('button', { name: 'Send to approval review' }).click()
    await expect(window.getByText(/Action queue is paused/)).toBeVisible({ timeout: 10000 })
  } finally {
    await close()
    rmSync(tempDir, { recursive: true, force: true })
  }
})
