import { test as base, type Page, chromium } from "@playwright/test";
import { _electron as electron, type ElectronApplication } from "playwright";
import path from "path";

const ELECTRON_PROJECT = "electron";

export const test = base.extend<
  { page: Page },
  { electronApp: ElectronApplication | null }
>({
  electronApp: [async ({}, use, workerInfo) => {
    if (workerInfo.project.name !== ELECTRON_PROJECT) {
      await use(null);
      return;
    }

    const mainScript = path.resolve(__dirname, "../../electron/main.js");
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;

    const args = [mainScript];
    if (process.platform === "win32") {
      args.push(
        "--disable-gpu-sandbox",
        "--disable-network-service-sandbox",
        "--disable-features=IsolateOrigins,site-per-process,SpareRendererForSitePerProcess",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
      );
    }

    const app = await electron.launch({ args, env });
    try {
      await use(app);
    } finally {
      await app.close();
    }
  }, { scope: "worker" }],

  page: async ({ electronApp }, use, testInfo) => {
    if (testInfo.project.name === ELECTRON_PROJECT) {
      if (!electronApp) throw new Error("Electron fixture did not launch the application");
      const page = await electronApp.firstWindow();
      await page.waitForLoadState("domcontentloaded", { timeout: 20_000 });
      await use(page);
      return;
    }

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await use(page);
    } finally {
      await context.close();
      await browser.close();
    }
  },
});

export { expect } from "@playwright/test";
