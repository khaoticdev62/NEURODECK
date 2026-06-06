import { test, expect } from '../support/electron-fixture';

test.describe('Electron Native', () => {
  test('launches electron and renders the boot sequence', async ({ page }) => {
    // Wait for the NEURODECK UI to load. The boot overlay takes a moment to disappear.
    await expect(page.locator('#app')).toBeVisible({ timeout: 15000 });

    // Verify the title is correct
    expect(await page.title()).toBe('neurodeck');
  });

  test('verifies custom file protocol is used', async ({ page }) => {
    const url = page.url();
    // Since we did not pass ELECTRON_DEV=1, it should use the neurodeck:// custom scheme.
    expect(url).toContain('neurodeck://app/index.html');
  });

  test('verifies torrent inner tab is accessible in the share view', async ({ page }) => {
    await expect(page.locator('#app')).toBeVisible({ timeout: 15000 });
    await page.click('button[data-view="share"]');
    await page.click('button.share-inner-tab[data-panel="torrent"]');
    await expect(page.locator('#share-panel-torrent')).toBeVisible();
    await expect(page.locator('#torrent-source-input')).toBeVisible();
  });

  // ── Security smoke tests ──────────────────────────────────────────────────

  test('nodeIntegration is disabled — require is not available in renderer', async ({ page }) => {
    // If nodeIntegration were enabled, `require` would be defined globally in the renderer.
    const hasRequire = await page.evaluate(() => typeof (window as any).require !== 'undefined');
    expect(hasRequire).toBe(false);
  });

  test('preload bridge is available — window.electronAPI is defined', async ({ page }) => {
    const hasApi = await page.evaluate(() => typeof window.electronAPI !== 'undefined');
    expect(hasApi).toBe(true);
  });

  test('bridge port is exposed synchronously — NEURODECK_PORT is a numeric string', async ({ page }) => {
    const port = await page.evaluate(() => window.NEURODECK_PORT);
    expect(port).toBeDefined();
    expect(Number.isInteger(Number(port))).toBe(true);
    const portNum = Number(port);
    expect(portNum).toBeGreaterThanOrEqual(1024);
    expect(portNum).toBeLessThanOrEqual(65535);
  });

  test('custom protocol serves app content — not a filesystem escape', async ({ page }) => {
    // The page should have an #app container rendered by the frontend, confirming the
    // neurodeck:// protocol resolved to frontend/dist/index.html (not an arbitrary file).
    await expect(page.locator('#app')).toBeVisible({ timeout: 15000 });

    // The page title should be from the app's own HTML, not a raw file listing or error.
    const title = await page.title();
    expect(title).toBe('neurodeck');
  });

  test('electronAPI.platform returns a known OS string', async ({ page }) => {
    const platform = await page.evaluate(() => window.electronAPI.platform);
    expect(['win32', 'linux', 'darwin']).toContain(platform);
  });

  test('electronAPI.versions contains expected fields', async ({ page }) => {
    const versions = await page.evaluate(() => window.electronAPI.versions);
    expect(versions).toHaveProperty('electron');
    expect(versions).toHaveProperty('chrome');
    expect(versions).toHaveProperty('node');
    expect(versions).toHaveProperty('app');
  });
});
