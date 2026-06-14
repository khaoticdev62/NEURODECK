import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage";
import { SettingsPage } from "../pages/SettingsPage";

test.beforeEach(async ({ page }) => {
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();
});

test("settings shell opens, switches themed tabs, and closes", async ({ page }) => {
  const settings = new SettingsPage(page);
  await settings.openSettings();

  await expect(settings.modalCard).toBeVisible();
  await expect(settings.modalCard).toHaveAttribute("data-settings-theme", "general");
  await settings.sidebarAppearance.click();
  await expect(settings.modalCard).toHaveAttribute("data-settings-theme", "appearance");
  await expect(page.locator("#sp-appearance")).toHaveClass(/active/);

  await settings.sidebarInput.click();
  await expect(settings.modalCard).toHaveAttribute("data-settings-theme", "input");
  await expect(page.locator("#sp-input")).toHaveClass(/active/);

  await settings.closeSettings();
});

test("stale settings tab state falls back to General", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("settingsActivePanel", "sp-does-not-exist"));
  await page.reload();
  const settings = new SettingsPage(page);
  await settings.openSettings();

  await expect(settings.modalCard).toHaveAttribute("data-settings-theme", "general");
  await expect(page.locator("#sp-general")).toHaveClass(/active/);
});

test("command palette opens and drives view and settings shortcuts", async ({ page }) => {
  const app = new AppPage(page);
  await app.openCommandPalette();

  await page.locator("#command-palette-input").fill("prompt lab");
  await page.locator("#command-palette-list .command-palette-item").first().click();
  await expect(page.getByTestId("nav-tab-prompt-lab")).toHaveClass(/active/);
  await expect(page.getByTestId("view-prompt-lab")).toHaveClass(/active/);

  await app.openCommandPalette();
  await page.locator("#command-palette-input").fill("appearance");
  await page.locator("#command-palette-list .command-palette-item").first().click();

  const settings = new SettingsPage(page);
  await expect(settings.settingsOverlay).toHaveClass(/active/);
  await expect(settings.modalCard).toHaveAttribute("data-settings-theme", "appearance");
  await expect(page.locator("#sp-appearance")).toHaveClass(/active/);
});

test("all primary nav tabs remain clickable across the full strip", async ({ page }) => {
  const app = new AppPage(page);
  const tabs = [
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

  for (const view of tabs) {
    await app.navigateTo(view);
  }
});

test("settings modal remains in viewport on compact window sizes", async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 720 });
  await page.reload();
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();

  const settings = new SettingsPage(page);
  await settings.openSettings();
  await expect(settings.modalCard).toBeVisible();

  const box = await settings.modalCard.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(1180);
  expect(box!.y + box!.height).toBeLessThanOrEqual(720);

  const panel = page.locator("#sp-privacy");
  await settings.sidebarPrivacy.click();
  await expect(panel).toHaveClass(/active/);
  await expect(panel).toBeVisible();
});

test("docs and remote views stay usable without horizontal overflow on narrow windows", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.reload();
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();

  await app.navigateTo("remote");
  await expect(page.getByRole('heading', { name: 'Remote Control' })).toBeVisible();
  const remoteMetrics = await page.locator("[data-testid='remote-view']").evaluate((el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
  }));
  expect(remoteMetrics.scrollWidth).toBeLessThanOrEqual(remoteMetrics.clientWidth + 2);
  await expect(page.locator("[data-testid='remote-status-badge']")).toBeVisible();

  await app.navigateTo("docs");
  await expect(page.locator(".docs-kicker")).toBeVisible();
  const docsMetrics = await page.locator(".docs-container").evaluate((el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
  }));
  expect(docsMetrics.scrollWidth).toBeLessThanOrEqual(docsMetrics.clientWidth + 2);
  await expect(page.locator(".docs-search-shell")).toBeVisible();
  await expect(page.locator("#docs-search-input")).toBeVisible();
});

test("tool-heavy tabs stay horizontally centered on wide viewports", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();

  const centeredTabs = [
    ["browser", ".browser-container"],
    ["agent", ".agent-shell"],
    ["memory", ".memory-shell"],
    ["remote", "[data-testid='remote-view']"],
    ["docs", ".docs-container"],
  ] as const;

  for (const [view, shellSelector] of centeredTabs) {
    await app.navigateTo(view);
    await page.waitForTimeout(350);

    const metrics = await page.locator(shellSelector).evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const mainEl = document.getElementById("main-content");
      const mainRect = mainEl ? mainEl.getBoundingClientRect() : { left: 0, width: window.innerWidth };
      return {
        left: rect.left,
        width: rect.width,
        centerX: rect.left + rect.width / 2,
        mainCenterX: mainRect.left + mainRect.width / 2,
      };
    });

    expect(Math.abs(metrics.centerX - metrics.mainCenterX)).toBeLessThanOrEqual(2);
    expect(metrics.left).toBeGreaterThanOrEqual(0);
  }
});

test("chat, memory, and prompt lab expose the refined shell hierarchy", async ({ page }) => {
  const app = new AppPage(page);
  await app.navigateTo("chat");
  await expect(page.locator("#chat-viewport")).toBeVisible();

  await app.navigateTo("memory");
  await expect(page.locator(".memory-kicker")).toBeVisible();
  await expect(page.locator(".memory-search-shell")).toBeVisible();

  await app.navigateTo("prompt-lab");
  await expect(page.locator(".pl-header-kicker")).toBeVisible();
  await expect(page.locator("#pl-open-gallery-btn .nd-icon-svg")).toBeVisible();
  await expect(page.locator("#pl-optimize-ai-btn .nd-icon-svg")).toBeVisible();
});

test("agent, browser, and tunnel expose the refined shell hierarchy", async ({ page }) => {
  const app = new AppPage(page);
  await app.navigateTo("agent");
  await expect(page.locator(".agent-kicker")).toBeVisible();
  await expect(page.locator(".agent-shell")).toBeVisible();
  await expect(page.locator("#agent-task-input")).toBeVisible();
  await expect(page.locator("#agent-run-btn")).toBeVisible();

  await app.navigateTo("browser");
  await expect(page.locator(".browser-container")).toBeVisible();
  await expect(page.locator("#browser-address-input")).toBeVisible();

  await app.navigateTo("tunnel");
  await expect(page.locator(".tunnel-kicker").first()).toBeVisible();
});

test("ssh and share transfer surfaces expose the refined shell hierarchy", async ({ page }) => {
  const app = new AppPage(page);
  await app.navigateTo("ssh");
  await expect(page.locator(".ssh-kicker")).toBeVisible();

  await app.navigateTo("share");
  await expect(page.locator(".share-view-kicker")).toBeVisible();

  await page.locator('.share-inner-tab[data-panel="torrent"]').click();
  await expect(page.locator("#share-panel-torrent")).toHaveClass(/active/);
  await expect(page.locator(".torrent-kicker")).toBeVisible();
});

test("notification center opens with the refined modal hierarchy", async ({ page }) => {
  const app = new AppPage(page);
  await app.notifBtn.click();
  const modal = page.locator("#notif-modal");
  await expect(modal).toHaveClass(/active/);
  await expect(modal.locator(".notif-modal-card").last()).toBeVisible();
});

test("controller prompt picker and history search expose refined utility chrome", async ({ page }) => {
  const app = new AppPage(page);
  await page.keyboard.press("Control+Shift+P");
  await expect(page.locator("#ctrl-prompt-overlay")).toHaveClass(/active/);
  await expect(page.locator(".ctrl-prompt-title > .nd-icon-svg")).toBeVisible();
  await expect(page.locator(".ctrl-prompt-cat-icon .nd-icon-svg").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#ctrl-prompt-overlay")).toBeHidden();

  await app.navigateTo("terminal");
  await page.locator('button[aria-label="Search terminal output"]').click();
  await expect(page.locator('div[aria-label="Terminal output search"]')).toBeVisible();
  await expect(page.locator('input[placeholder="Search output or session id..."]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('div[aria-label="Terminal output search"]')).toBeHidden();
});

test("canvas toolbar exposes shared icon actions", async ({ page }) => {
  const app = new AppPage(page);
  await app.navigateTo("canvas");
  await expect(page.locator("#canvas-run-btn .nd-icon-svg")).toBeVisible();
  await expect(page.locator("#canvas-copy-btn .nd-icon-svg")).toBeVisible();
  await expect(page.locator("#canvas-clear-btn .nd-icon-svg")).toBeVisible();
  await expect(page.locator("#canvas-ai-edit-btn .nd-icon-svg")).toBeVisible();
  await expect(page.locator("#canvas-collab-btn .nd-icon-svg")).toBeVisible();
});

test("canvas toolbar wraps cleanly on compact widths", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 720 });
  await page.reload();
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();
  await app.navigateTo("canvas");

  const metrics = await page.locator(".canvas-toolbar").evaluate((el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
    clientHeight: el.clientHeight,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
  expect(metrics.clientHeight).toBeGreaterThan(46);
});

test("theme selection persists across reload", async ({ page }) => {
  const settings = new SettingsPage(page);
  await settings.openSettings();
  await settings.openTab("general");

  const cards = page.locator("[data-testid='theme-card']");
  await expect(cards.first()).toBeVisible();
  const target = cards.nth(1);
  const targetName = await target.locator("p").first().textContent();
  await target.click();
  await page.waitForTimeout(400);

  await settings.closeSettings();
  await page.reload();

  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();

  await settings.openSettings();
  await settings.openTab("general");
  const activeCard = page.locator("[data-testid='theme-card'].border-nd-accent\\/50");
  await expect(activeCard).toBeVisible();
});
