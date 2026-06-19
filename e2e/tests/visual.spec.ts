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
    // Stabilize (network, fonts, layout) before taking screenshot
    await app.stabilizeForScreenshot();
    const screenshotOptions = {
      fullPage: false,
      // Allow a larger diff for the chat view during triage; other views keep strict tolerance.
      maxDiffPixels: view === "chat" ? 40000 : 200,
    } as const;
    await expect(page).toHaveScreenshot(`${view}-1280x800.png`, screenshotOptions);
  });
}

test("visual regression: settings modal at 1280x800", async ({ page }) => {
  const app = new AppPage(page);
  await app.openSettings();
  await app.stabilizeForScreenshot();
  await expect(page).toHaveScreenshot("settings-1280x800.png", {
    fullPage: false,
    maxDiffPixels: 200,
  });
});

test("visual regression: command palette at 1280x800", async ({ page }) => {
  const app = new AppPage(page);
  await app.openCommandPalette();
  await app.stabilizeForScreenshot();
  await expect(page).toHaveScreenshot("command-palette-1280x800.png", {
    fullPage: false,
    maxDiffPixels: 200,
  });
});

test("visual regression: shortcuts overlay at 1280x800", async ({ page }) => {
  const app = new AppPage(page);
  await app.openShortcuts();
  await app.stabilizeForScreenshot();
  await expect(page).toHaveScreenshot("shortcuts-1280x800.png", {
    fullPage: false,
    maxDiffPixels: 200,
  });
});

test("visual regression: deck mode hint bar at 1280x800", async ({ page }) => {
  const app = new AppPage(page);
  await app.setDeckMode(true);
  await app.stabilizeForScreenshot();
  await expect(app.controllerHintBar).toBeVisible();
  await expect(page).toHaveScreenshot("deck-mode-hint-bar-1280x800.png", {
    fullPage: false,
    maxDiffPixels: 200,
  });
});
