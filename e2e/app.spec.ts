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
  await expect(window.getByRole('banner')).toBeVisible()
  await expect(window.getByRole('navigation', { name: 'Primary' })).toBeVisible()
  await expect(window.getByRole('link', { name: 'Home' })).toBeVisible()
  await window.getByRole('link', { name: 'Terminal' }).click()
  await expect(window.getByText('No active workspace')).toBeVisible()
  await app.close()
})
