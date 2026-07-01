import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { launchApp } from './helpers/launchApp'

const OUTPUT_DIR = join('test-results', 'ui-polish')

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/search', name: 'search' },
  { path: '/ai', name: 'ai-canvas' },
  { path: '/workspaces', name: 'workspaces' },
  { path: '/terminal', name: 'terminal' },
  { path: '/git', name: 'git' },
  { path: '/system', name: 'system' },
  { path: '/remote', name: 'remote' }
]

const VIEWPORTS = [
  { width: 1280, height: 800, name: '1280x800' },
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 2560, height: 1440, name: '2560x1440' }
]

async function waitForShell(page: Page): Promise<void> {
  await expect(page.getByRole('banner')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
}

async function navigateTo(page: Page, path: string): Promise<void> {
  await page.evaluate((nextPath) => {
    window.location.hash = nextPath
  }, path)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(250)
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
    )
    .toBe(true)
}

async function setWorkbenchAttributes(
  page: Page,
  attributes: Record<string, string>
): Promise<void> {
  await page.evaluate((nextAttributes) => {
    const root = document.querySelector('[data-ndx-theme="hybrid-dark"]') as HTMLElement | null
    if (!root) return
    for (const [key, value] of Object.entries(nextAttributes)) {
      root.setAttribute(key, value)
    }
  }, attributes)
}

test('captures polished core UI surfaces across target display states', async () => {
  test.setTimeout(180_000)
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const { app, close } = await launchApp()
  const page = await app.firstWindow()
  await waitForShell(page)

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const route of ROUTES) {
      await navigateTo(page, route.path)
      await assertNoHorizontalOverflow(page)
      await page.screenshot({
        path: join(OUTPUT_DIR, `${viewport.name}-${route.name}.png`),
        fullPage: false
      })
    }
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  await navigateTo(page, '/')

  await setWorkbenchAttributes(page, { 'data-reduce-motion': 'true' })
  await page.screenshot({
    path: join(OUTPUT_DIR, '1280x800-reduced-motion.png'),
    fullPage: false
  })

  await setWorkbenchAttributes(page, { 'data-high-contrast': 'true' })
  await page.screenshot({
    path: join(OUTPUT_DIR, '1280x800-high-contrast.png'),
    fullPage: false
  })

  await setWorkbenchAttributes(page, { 'data-text-size': 'large' })
  await page.screenshot({
    path: join(OUTPUT_DIR, '1280x800-large-text.png'),
    fullPage: false
  })

  await close()
})
