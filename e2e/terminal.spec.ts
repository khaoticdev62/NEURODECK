import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp } from './helpers/launchApp'

/**
 * Proves a real shell actually executed a command through the real
 * PTY -> IPC -> xterm pipe, not just that the terminal screen renders.
 */
test('runs a real shell command through the PTY and sees its output in the terminal', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'ndx-e2e-terminal-'))
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

    const marker = `NDX_E2E_${Date.now()}`
    const viewport = window.getByLabel(/Terminal session/)
    await viewport.click()
    await window.keyboard.type(`echo ${marker}`)
    await window.keyboard.press('Enter')

    await expect(window.getByText(marker)).toBeVisible({ timeout: 10000 })
  } finally {
    await close()
    rmSync(tempDir, { recursive: true, force: true })
  }
})
