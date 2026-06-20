import { test, expect } from '../support/electron-fixture';

test.describe('Electron Native', () => {
  test('launches electron and renders the boot sequence', async ({ page }) => {
    // Wait for the NEURODECK UI to load. The boot overlay takes a moment to disappear.
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    // Verify the title is correct
    expect(await page.title()).toBe('NEURODECK');
  });

  test('verifies custom file protocol is used', async ({ page }) => {
    const url = page.url();
    // Since we did not pass ELECTRON_DEV=1, it should use the neurodeck:// custom scheme.
    expect(url).toContain('neurodeck://app/index.html');
  });

  test('verifies torrent inner tab is accessible in the share view', async ({ page }) => {
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
    await page.locator('button[data-view="share"]:visible').first().evaluate((element) =>
      (element as HTMLButtonElement).click());
    await expect(page.getByTestId('view-share')).toHaveClass(/active/);
    await page.locator('#share-tab-torrent').click();
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
    // The page should have the React root rendered by the frontend, confirming the
    // neurodeck:// protocol resolved to frontend/dist/index.html (not an arbitrary file).
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    // The page title should be from the app's own HTML, not a raw file listing or error.
    const title = await page.title();
    expect(title).toBe('NEURODECK');
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

  test('Steam Deck readiness: window, representative views, overlays and controller mode', async ({ page, electronApp }, testInfo) => {
    if (!electronApp) throw new Error('Electron application fixture is unavailable');
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
    await page.locator('#boot-overlay').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});

    const bounds = await electronApp.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      return window?.getContentBounds();
    });
    expect(bounds).toBeDefined();
    expect(bounds!.width).toBeLessThanOrEqual(1280);
    expect(bounds!.height).toBeLessThanOrEqual(800);

    for (const view of ['chat', 'terminal', 'canvas'] as const) {
      await page.locator(`button[data-view="${view}"]:visible`).first().evaluate((element) =>
        (element as HTMLButtonElement).click());
      await expect(page.getByTestId(`view-${view}`)).toHaveClass(/active/);
      const overflow = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }));
      expect(overflow.width).toBeLessThanOrEqual(1281);
      expect(overflow.height).toBeLessThanOrEqual(801);
    }

    await page.locator('button[data-view="browser"]:visible').first().evaluate((element) =>
      (element as HTMLButtonElement).click());
    await expect(page.getByTestId('view-browser')).toHaveClass(/active/);
    const addressInput = page.getByPlaceholder('Search or enter web URL...');
    await expect(addressInput).toBeVisible();
    await addressInput.fill('https://example.com');
    await page.getByRole('button', { name: 'Go' }).click();
    await expect.poll(async () => page.evaluate(async () => {
      const browser = (window as any).neurodeck?.browser;
      return browser ? browser.getTabs() : [];
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: expect.stringContaining('example.com') }),
    ]));

    await page.locator('#settings-btn').evaluate((element) => (element as HTMLButtonElement).click());
    await expect(page.locator('#settings-overlay')).toHaveClass(/active/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#settings-overlay')).not.toHaveClass(/active/);

    await page.locator('#command-palette-btn').evaluate((element) => (element as HTMLButtonElement).click());
    await expect(page.locator('#command-palette-overlay')).toHaveClass(/active/);
    await page.keyboard.press('Escape');

    const deckToggle = page.getByTestId('deck-mode-toggle');
    await deckToggle.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(page.locator('[aria-label="Controller hints"]')).toBeVisible();

    await testInfo.attach('electron-steam-deck-readiness.png', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });
  });
});
