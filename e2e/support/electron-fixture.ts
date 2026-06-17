import { test as base, Page, chromium } from '@playwright/test';
import { _electron as electron, ElectronApplication } from 'playwright';
import path from 'path';

const DESKTOP_PROJECT = 'chromium-desktop';

export const test = base.extend<{ page: Page; electronApp: ElectronApplication | null }>({
  electronApp: async ({}, use) => {
    // Only launch Electron for the desktop project; otherwise leave it null
    // so the page fixture can provide a lightweight placeholder.
    await use(null);
  },
  page: async ({}, use, testInfo) => {
    if (testInfo.project.name !== DESKTOP_PROJECT) {
      // Provide a normal browser page so tests that call test.skip() for
      // non-desktop projects can do so without launching Electron.
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await use(page);
      } finally {
        await context.close();
        await browser.close();
      }
      return;
    }

    const mainScript = path.resolve(__dirname, '../../electron/main.js');
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;

    const args = [mainScript];
    if (process.platform === 'win32') {
      // Work around Windows GPU/network sandbox child-process crashes during
      // long-running E2E runs. Renderer sandbox remains enabled.
      args.push(
        '--disable-gpu-sandbox',
        '--disable-network-service-sandbox',
        '--disable-features=IsolateOrigins,site-per-site,SpareRendererForSitePerProcess',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding'
      );
    }

    const electronApp = await electron.launch({
      args,
      env,
    });

    try {
      const page = await electronApp.firstWindow();
      // M5: explicit timeout prevents hanging if the sidecar or renderer never reaches domcontentloaded
      await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
      await use(page);
    } finally {
      await electronApp.close();
    }
  },
});

export { expect } from '@playwright/test';
