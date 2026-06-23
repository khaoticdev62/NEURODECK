import { _electron as electron, expect, test } from '@playwright/test'

/**
 * Boots the production build of the Electron app and asserts the baseline
 * shell renders. Run `npm run build` before this suite — it launches `out/main/index.js`.
 */
test('boots and renders the baseline shell', async () => {
  // ELECTRON_RUN_AS_NODE forces Electron to behave as plain Node and must
  // never reach the launched process — clear it explicitly rather than
  // relying on the host shell's environment.
  const env: Record<string, string | undefined> = { ...process.env }
  // Electron's native bootstrap checks for the *presence* of this variable,
  // not its value — setting it to '' still forces Node mode. It must be deleted.
  delete env.ELECTRON_RUN_AS_NODE

  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: env as Record<string, string>
  })
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

  await window.evaluate(() => {
    window.location.hash = '/terminal'
  })
  await expect(window).toHaveURL(/terminal/)
  await expect(window.getByText('No active workspace')).toBeVisible()
  await window.evaluate(() => {
    window.location.hash = '/terminal/builder'
  })
  await expect(window).toHaveURL(/terminal\/builder/)
  await expect(window.getByText('No active workspace')).toBeVisible()
  await window.evaluate(() => {
    window.location.hash = '/browser'
  })
  await expect(window).toHaveURL(/browser/)
  await expect(window.getByText('No active workspace')).toBeVisible()
  await window.evaluate(() => {
    window.location.hash = '/remote'
  })
  await expect(window).toHaveURL(/remote/)
  await expect(window.getByText('No remote hosts')).toBeVisible()
  await window.evaluate(() => {
    window.location.hash = '/ai'
  })
  await expect(window).toHaveURL(/\/ai/)
  await expect(window.getByText('No active workspace')).toBeVisible()
  await app.close()
})
