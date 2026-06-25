import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp } from './helpers/launchApp'

/**
 * Proves `RecoveryService` actually persisted a real checkpoint when a
 * file is deleted, not that Recovery Timeline merely renders a static
 * list — deletes a real file via FileManager's real Delete action, then
 * confirms a checkpoint referencing that exact path appears.
 */
test('deleting a real file records a real recovery checkpoint', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'ndx-e2e-recovery-'))
  const fileName = 'notes.txt'
  writeFileSync(join(tempDir, fileName), 'content to be deleted')
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
      window.location.hash = '/files'
    })
    await expect(window.getByText(fileName)).toBeVisible({ timeout: 10000 })

    await window.getByRole('button', { name: 'Delete' }).click()
    await window.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(window.getByText('Empty folder')).toBeVisible({ timeout: 10000 })

    await window.evaluate(() => {
      window.location.hash = '/recovery'
    })
    await expect(window.getByText('Deleted file')).toBeVisible({ timeout: 10000 })
    await expect(window.getByText(fileName)).toBeVisible()
  } finally {
    await close()
    rmSync(tempDir, { recursive: true, force: true })
  }
})
