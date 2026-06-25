import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp } from './helpers/launchApp'

/**
 * Proves the full real ActionQueue approval pipeline executed against a
 * real PTY: builds a command in the standalone Command Builder, approves
 * it in the real Approval Queue, and confirms its output actually reached
 * the real terminal — not that the queue merely transitioned state.
 */
test('builds a command, approves it in the real Approval Queue, and sees it run in the real terminal', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'ndx-e2e-builder-'))
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

    const marker = `NDX_BUILDER_E2E_${Date.now()}`
    await window.evaluate(() => {
      window.location.hash = '/terminal/builder'
    })
    await window.getByPlaceholder(/Executable/).fill('echo')
    await window.getByRole('button', { name: 'Add block' }).click()
    await window.getByPlaceholder(/Program operation/).fill(marker)
    await expect(window.getByText(`echo ${marker}`)).toBeVisible()

    await window.getByRole('button', { name: 'Send to approval review' }).click()
    await expect(window.getByText('REQUEST: Run local terminal command')).toBeVisible({
      timeout: 10000
    })
    await window.getByRole('button', { name: 'Approve once' }).click()

    await window.evaluate(() => {
      window.location.hash = '/terminal'
    })
    await expect(window.getByText(marker)).toBeVisible({ timeout: 10000 })
  } finally {
    await close()
    rmSync(tempDir, { recursive: true, force: true })
  }
})
