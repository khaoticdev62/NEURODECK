import { expect, type Page, test } from '@playwright/test'
import { launchApp } from './helpers/launchApp'

const TARGET_VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 }
]

async function waitForShell(window: Page): Promise<void> {
  await expect(window.getByRole('banner')).toBeVisible({ timeout: 20000 })
  await expect(window.getByRole('navigation', { name: 'Primary' })).toBeVisible()
}

async function expectNoHorizontalOverflow(window: Page): Promise<void> {
  const overflow = await window.evaluate(() => {
    const root = document.documentElement
    const body = document.body
    return Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth
  })
  expect(overflow).toBeLessThanOrEqual(2)
}

test('remaining hybrid routes render across target viewport sizes without horizontal overflow', async () => {
  const { app, close } = await launchApp()
  const window = await app.firstWindow()

  await waitForShell(window)

  for (const viewport of TARGET_VIEWPORTS) {
    await window.setViewportSize(viewport)

    await window.evaluate(() => {
      window.location.hash = '/onboarding/tutorial'
    })
    await expect(window.getByText('Controller Tutorial', { exact: true })).toBeVisible()
    await expect(window.getByText('ND-007 Guided Controller Tutorial')).toBeVisible()
    await expectNoHorizontalOverflow(window)

    await window.evaluate(() => {
      window.location.hash = '/learn/lab/bundled:neurodeck-quick-start/basics/open-terminal'
    })
    await expect(window.getByText('NeuroDeck Quick Start')).toBeVisible()
    await expect(window.getByText('Lab terminal')).toBeVisible()
    await expect(window.getByText('No workspace yet')).toBeVisible()
    await expectNoHorizontalOverflow(window)
  }

  await close()
})
