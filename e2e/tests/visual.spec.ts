import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage";

test.beforeEach(async ({ page }) => {
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();
});

const viewTabs = [
  "chat",
  "canvas",
  "terminal",
  "ssh",
  "tunnel",
  "share",
  "browser",
  "agent",
  "memory",
  "prompt-lab",
  "remote",
  "docs",
] as const;

for (const view of viewTabs) {
  test(`visual regression: ${view} view at 1280x800`, async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo(view);
    // Allow CSS transitions to settle
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot(`${view}-1280x800.png`, {
      fullPage: false,
      maxDiffPixels: 200,
    });
  });
}

test("visual regression: settings modal at 1280x800", async ({ page }) => {
  const app = new AppPage(page);
  await app.openSettings();
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot("settings-1280x800.png", {
    fullPage: false,
    maxDiffPixels: 200,
  });
});

test("visual regression: command palette at 1280x800", async ({ page }) => {
  const app = new AppPage(page);
  await app.openCommandPalette();
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot("command-palette-1280x800.png", {
    fullPage: false,
    maxDiffPixels: 200,
  });
});

test("visual regression: shortcuts overlay at 1280x800", async ({ page }) => {
  const app = new AppPage(page);
  await app.openShortcuts();
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot("shortcuts-1280x800.png", {
    fullPage: false,
    maxDiffPixels: 200,
  });
});
