import { expect, test } from '@playwright/test'
import { launchApp } from './helpers/launchApp'

/**
 * Boots the production build of the Electron app and asserts the baseline
 * shell renders. Run `npm run build` before this suite — it launches `out/main/index.js`.
 */
test('boots and renders the baseline shell', async () => {
  const { app, close } = await launchApp()
  const window = await app.firstWindow()

  // Regression guard: the preload script (window.ndx) has previously failed
  // to load silently — electron-vite externalizes npm dependencies by
  // default, but a *sandboxed* preload can't `require()` them (only the
  // unsandboxed main process can), so a bare `require("zod")` in the
  // bundled preload threw and contextBridge.exposeInMainWorld never ran.
  // The shell still rendered (every screen has a real "bridge unavailable"
  // fallback), so this is the only check that actually catches it.
  const bridgeType = await window.evaluate(
    () => typeof (window as unknown as { ndx?: unknown }).ndx
  )
  expect(bridgeType).toBe('object')

  // ND-001 Boot and Session Start is the first screen. Wait for it to finish
  // service checks and route into the shell (first-run onboarding when no
  // workspaces or providers are configured).
  await expect(window.getByText('NeuroDeck')).toBeVisible()
  await expect(window.getByText('Loading core services')).toBeVisible()
  await expect(window.getByRole('banner')).toBeVisible({ timeout: 20000 })
  await expect(window.getByRole('navigation', { name: 'Primary' })).toBeVisible()
  await expect(window.getByRole('link', { name: 'Home' })).toBeVisible()
  await window.setViewportSize({ width: 1280, height: 800 })
  await expect
    .poll(async () =>
      window.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }))
    )
    .toEqual({ width: 1280, scrollWidth: 1280 })

  await window.evaluate(() => {
    window.location.hash = '/terminal'
  })
  await expect(window).toHaveURL(/terminal/)
  await expect(window.getByText('No workspace yet')).toBeVisible()
  await window.evaluate(() => {
    window.location.hash = '/terminal/builder'
  })
  await expect(window).toHaveURL(/terminal\/builder/)
  await expect(window.getByText('No workspace yet')).toBeVisible()
  await window.evaluate(() => {
    window.location.hash = '/browser'
  })
  await expect(window).toHaveURL(/browser/)
  await expect(window.getByText('No workspace yet')).toBeVisible()
  await window.evaluate(() => {
    window.location.hash = '/remote'
  })
  await expect(window).toHaveURL(/remote/)
  await expect(window.getByText('No remote hosts')).toBeVisible()
  await expect
    .poll(async () =>
      window.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
    )
    .toBe(true)
  await window.evaluate(() => {
    window.location.hash = '/ai'
  })
  await expect(window).toHaveURL(/\/ai/)
  await expect(window.getByText('No workspace yet')).toBeVisible()
  await close()
})

/**
 * ND-044 theme builder: `DisplayThemeSettings` persists through the real
 * IPC store, and `ShellLayout`/`NdxWorkbench` thread the result into
 * `data-ndx-*` attributes `tokens.css` responds to. This is the only check
 * that would catch a prop-threading regression between the two — a unit
 * test on either component in isolation wouldn't.
 */
test('theme builder controls patch the live data-ndx-* attributes on the workbench root', async () => {
  const { app, close } = await launchApp()
  const window = await app.firstWindow()
  await expect(window.getByRole('banner')).toBeVisible({ timeout: 20000 })

  await window.evaluate(() => {
    window.location.hash = '/settings/display'
  })
  await expect(window).toHaveURL(/settings\/display/)

  const workbenchRoot = window.locator('[data-ndx-theme]')
  await expect(workbenchRoot).toHaveAttribute('data-ndx-accent', 'cyan')
  await expect(workbenchRoot).toHaveAttribute('data-ndx-radius', 'soft')
  await expect(workbenchRoot).toHaveAttribute('data-ndx-density', 'comfortable')
  await expect(workbenchRoot).toHaveAttribute('data-ndx-focus-style', 'ring')

  await window.getByRole('button', { name: /Violet/ }).click()
  await expect(workbenchRoot).toHaveAttribute('data-ndx-accent', 'violet')

  await window.getByRole('button', { name: 'sharp' }).click()
  await expect(workbenchRoot).toHaveAttribute('data-ndx-radius', 'sharp')

  await window.getByRole('button', { name: 'spacious' }).click()
  await expect(workbenchRoot).toHaveAttribute('data-ndx-density', 'spacious')

  await window.getByRole('button', { name: 'underline' }).click()
  await expect(workbenchRoot).toHaveAttribute('data-ndx-focus-style', 'underline')

  await close()
})
