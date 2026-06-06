import { test as base, Page } from '@playwright/test';
import { _electron as electron, ElectronApplication } from 'playwright';
import path from 'path';

export const test = base.extend<{ page: Page, electronApp: ElectronApplication }>({
  electronApp: async ({}, use) => {
    const mainScript = path.resolve(__dirname, '../../electron/main.js');
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    
    const electronApp = await electron.launch({
      args: [mainScript],
      env
    });
    
    await use(electronApp);
    
    await electronApp.close();
  },
  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    // Wait for the window to finish loading
    await page.waitForLoadState('domcontentloaded');
    await use(page);
  }
});

export { expect } from '@playwright/test';
