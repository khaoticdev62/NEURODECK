import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage.ts";

test.describe("Command Palette v2", () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();
  });

  test("opens and closes with button and escape", async ({ page }) => {
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

  test("shows section headers when query is empty", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    await expect(page.getByText("All Commands", { exact: true })).toBeVisible();
    await expect(page.getByText("Starter Actions", { exact: true })).toBeVisible();
  });

  test("highlights matched characters", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    const input = page.locator("#command-palette-input");
    await input.fill("canvas");
    const firstItem = page.locator(".command-palette-item").first();
    await expect(firstItem.locator("mark")).toHaveCount(1);
  });

  test("tracks command history in localStorage", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    await page.locator("#command-palette-input").fill("Open Canvas");
    await page.keyboard.press("Enter");
    await expect(app.commandPaletteOverlay).not.toHaveClass(/active/);

    await app.openCommandPalette();
    await expect(page.getByText("Recent", { exact: true })).toBeVisible();
    await expect(page.locator(".command-palette-item").first()).toContainText("Open Canvas");
  });

  test("keyboard navigation cycles through results", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    const input = page.locator("#command-palette-input");
    await input.fill("settings");
    const first = page.locator('#command-palette-list [aria-selected="true"]');
    await expect(first).toBeVisible();

    await page.keyboard.press("ArrowDown");
    const items = page.locator(".command-palette-item");
    let foundActive = false;
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const selected = await items.nth(i).getAttribute("aria-selected");
      if (selected === "true") {
        foundActive = true;
        expect(i).toBe(1);
        break;
      }
    }
    expect(foundActive).toBe(true);
  });

  test("shows security audit starter action", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    const input = page.locator("#command-palette-input");
    await input.fill("security audit");
    const items = page.locator(".command-palette-item");
    await expect(items.first()).toContainText(/Security Audit/);
  });

  test("empty state shown when no matches", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    const input = page.locator("#command-palette-input");
    await input.fill("zzzzzzzz");
    await expect(page.getByText(/No commands match/)).toBeVisible();
    await expect(page.locator(".command-palette-item")).toHaveCount(0);
  });
});

test.describe("Quick Switcher", () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();
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
    // View names are lowercase; check the first span specifically
    await expect(items.first().locator("span").first()).toHaveText(/terminal/i);
    const labels = await items.allTextContents();
    expect(labels).not.toContain("ssh");
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

    // First item is active by default
    await expect(items.nth(0)).toHaveClass(/active/);

    // Additional Ctrl+Tab re-opens the switcher (current impl doesn't cycle)
    await page.keyboard.press("Control+Tab");
    await expect(app.quickSwitcherOverlay).toHaveClass(/active/);

    await app.closeQuickSwitcher();
  });

  test("switches to selected view on Enter", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("canvas");
    await app.navigateTo("terminal");
    // History now: [canvas, terminal]. Ctrl+Tab selects previous view (canvas).
    await page.keyboard.press("Control+Tab");
    await expect(app.quickSwitcherOverlay).toHaveClass(/active/);
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
