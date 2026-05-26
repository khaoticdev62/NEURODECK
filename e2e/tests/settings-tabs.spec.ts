import { test, expect } from "@playwright/test";
import { SettingsPage } from "../pages/SettingsPage";
import { AppPage } from "../pages/AppPage";

test.beforeEach(async ({ page }) => {
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();
});

test.fixme("all 9 settings tabs are accessible and render their panels", async ({ page }) => {
  const settings = new SettingsPage(page);
  await settings.openSettings();

  const tabs: Array<"general" | "appearance" | "terminal" | "network" | "plugins" | "sync" | "torrent" | "shortcuts" | "account"> = [
    "general",
    "appearance",
    "terminal",
    "network",
    "plugins",
    "sync",
    "torrent",
    "shortcuts",
    "account",
  ];

  for (const tab of tabs) {
    await settings.openTab(tab);
    await expect(page.locator(`#sp-${tab}`)).toBeVisible();
  }

  await settings.closeSettings();
});
