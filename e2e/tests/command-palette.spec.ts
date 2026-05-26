import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage.ts";

test.describe("Command Palette v2", () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();
  });

  test("opens and closes with keyboard shortcuts", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    await expect(page.locator("#command-palette-input")).toBeFocused();
    await app.closeCommandPalette();
    await expect(app.commandPaletteOverlay).not.toHaveClass(/active/);
  });

  test("fuzzy search filters actions", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    const input = page.locator("#command-palette-input");
    await input.fill("terminal");
    const items = page.locator(".command-palette-item");
    await expect(items.first()).toContainText("Terminal");
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("fuzzy search matches keywords and groups", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    const input = page.locator("#command-palette-input");
    await input.fill("ssh");
    const items = page.locator(".command-palette-item");
    await expect(items.first()).toContainText("Open SSH");
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("shows group headers when query is empty", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    await expect(page.locator(".command-palette-group-header").first()).toBeVisible();
    const headers = page.locator(".command-palette-group-header");
    const headerTexts = await headers.allTextContents();
    expect(headerTexts.length).toBeGreaterThanOrEqual(2);
  });

  test("highlights matched characters", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    const input = page.locator("#command-palette-input");
    await input.fill("chat");
    const firstItem = page.locator(".command-palette-item").first();
    await expect(firstItem.locator("mark.command-palette-match")).toHaveCount(4);
  });

  test("tracks command history in localStorage", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    await page.locator("#command-palette-input").fill("Open Canvas");
    await page.keyboard.press("Enter");
    await expect(app.commandPaletteOverlay).not.toHaveClass(/active/);

    await app.openCommandPalette();
    const historyHeader = page.locator(".command-palette-group-header").filter({ hasText: "History" });
    await expect(historyHeader).toBeVisible();
    await expect(page.locator(".command-palette-item").first()).toContainText("Open Canvas");
  });

  test("keyboard navigation cycles through results", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    const input = page.locator("#command-palette-input");
    await input.fill("settings");
    const first = page.locator(".command-palette-item.active");
    await expect(first).toBeVisible();

    await page.keyboard.press("ArrowDown");
    const items = page.locator(".command-palette-item");
    let foundActive = false;
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const cls = await items.nth(i).getAttribute("class");
      if (cls?.includes("active")) {
        foundActive = true;
        expect(i).toBe(1);
        break;
      }
    }
    expect(foundActive).toBe(true);
  });

  test("shows dynamic state-aware actions", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    const input = page.locator("#command-palette-input");
    await input.fill("mute");
    const items = page.locator(".command-palette-item");
    await expect(items.first()).toContainText(/Mute Audio|Unmute Audio/);
  });

  test("empty state shown when no matches", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    const input = page.locator("#command-palette-input");
    await input.fill("zzzzzzzz");
    await expect(page.locator(".command-palette-empty")).toBeVisible();
    await expect(page.locator(".command-palette-item")).toHaveCount(0);
  });
});

test.describe("Quick Switcher", () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.mockTauriBackend();
    await page.reload();
    await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});
  });

  test("opens with Ctrl+Tab when mocked Tauri exists", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("canvas");
    await app.navigateTo("terminal");
    await app.openQuickSwitcher();
    await expect(page.locator(".quick-switcher-item").first()).toBeVisible();
    await app.closeQuickSwitcher();
  });

  test("shows recent views excluding current", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("canvas");
    await app.navigateTo("terminal");
    await app.navigateTo("ssh");
    await app.openQuickSwitcher();
    const items = page.locator(".quick-switcher-item");
    await expect(items.first()).toContainText("Terminal");
    const labels = await items.allTextContents();
    expect(labels).not.toContain("SSH");
    await app.closeQuickSwitcher();
  });

  test("cycles through recent views with repeated Ctrl+Tab", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("canvas");
    await app.navigateTo("terminal");
    await app.navigateTo("ssh");
    await app.openQuickSwitcher();

    const items = page.locator(".quick-switcher-item");
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await expect(items.nth(0)).toHaveClass(/active/);

    await page.keyboard.press("Control+Tab");
    await expect(items.nth(1)).toHaveClass(/active/);

    await page.keyboard.press("Control+Tab");
    await expect(items.nth(0)).toHaveClass(/active/);

    await app.closeQuickSwitcher();
  });

  test("switches to selected view on Enter", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("canvas");
    await app.navigateTo("terminal");
    await app.openQuickSwitcher();
    await page.keyboard.press("Enter");
    await expect(app.quickSwitcherOverlay).not.toHaveClass(/active/);
    await expect(app.viewCanvas).toHaveClass(/active/);
  });

  test("closes with Escape", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("canvas");
    await app.openQuickSwitcher();
    await app.closeQuickSwitcher();
  });
});
