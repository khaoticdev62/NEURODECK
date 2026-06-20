import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage";

test.describe("Security & Ops — View Navigation", () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();
  });

  test("navigates to security view and shows hardening panel", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("security");
    const view = page.getByTestId("view-security");
    await expect(view.getByRole("heading", { name: "Hardening Status" })).toBeVisible();
    await expect(view.getByText("IPC payload validation")).toBeVisible();
  });

  test("security view shows v6 hardening active badge", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("security");
    await expect(page.getByTestId("view-security").getByText(/v6 hardening active/)).toBeVisible();
  });

  test("security view shows credential status panel", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("security");
    const view = page.getByTestId("view-security");
    await expect(view.getByRole("heading", { name: "API Key Status" })).toBeVisible();
    await expect(view.getByText("Gemini API Key")).toBeVisible();
  });

  test("navigates to themes view and shows theme manager heading", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("themes");
    // ThemesView title is "Supreme Theme System"
    await expect(
      page.getByTestId("view-themes").getByRole("heading", { name: "Supreme Theme System" })
    ).toBeVisible();
  });

  test("themes view renders all 7 theme cards", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("themes");
    // Scope to the view to avoid hidden SettingsView buttons
    const view = page.getByTestId("view-themes");
    const cards = view.locator('[aria-pressed]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(7);
  });

  test("themes view has exactly one active theme card", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("themes");
    // Scope to the view — LiveWallpaperPanel in hidden SettingsView also has aria-pressed="true"
    const view = page.getByTestId("view-themes");
    const active = view.locator('[aria-pressed="true"]');
    await expect(active.first()).toBeVisible();
    expect(await active.count()).toBe(1);
  });

  test("themes view theme card click updates the active card", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("themes");
    const view = page.getByTestId("view-themes");
    // Click a non-active theme card
    const inactive = view.locator('[aria-pressed="false"]').first();
    await inactive.click();
    // Still exactly one active card after clicking
    await expect(view.locator('[aria-pressed="true"]')).toHaveCount(1);
  });

  test("navigates to exports view and shows session exports", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("exports");
    const view = page.getByTestId("view-exports");
    await expect(view.getByRole("heading", { name: "Session Exports" })).toBeVisible();
    await expect(view.getByText("Export Markdown")).toBeVisible();
  });

  test("navigates to maintenance view and shows version panel", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("maintenance");
    const view = page.getByTestId("view-maintenance");
    await expect(view.getByRole("heading", { name: "Application Version" })).toBeVisible();
  });

  test("navigates to recovery view and shows error state panel", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("recovery");
    const view = page.getByTestId("view-recovery");
    await expect(view.getByRole("heading", { name: "Current Error State" })).toBeVisible();
  });
});

test.describe("Security & Ops — Command Palette Navigation", () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();
  });

  /**
   * Opens the command palette via the sidebar Cmd button (avoids the Ctrl+K double-toggle
   * issue in App.tsx where onKeyUp re-fires toggle-command closing the palette immediately).
   */
  async function openPaletteViaSidebar(page: any) {
    // Use the ID to avoid strict-mode ambiguity: there are two aria-label matches —
    // "#command-palette-btn" (title bar, has "(Ctrl K)" suffix) and a sidebar shortcut hint.
    await page.locator("#command-palette-btn").click();
    await expect(page.locator("#command-palette-overlay")).toHaveClass(/active/);
  }

  test("command palette lists Open Security Center", async ({ page }) => {
    await openPaletteViaSidebar(page);
    // All commands are visible unfiltered on open — assert the item exists in the list
    await expect(
      page.locator("#command-palette-list").getByText("Open Security Center")
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("command palette lists Open Theme Manager", async ({ page }) => {
    await openPaletteViaSidebar(page);
    await expect(
      page.locator("#command-palette-list").getByText("Open Theme Manager")
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("command palette lists Open Export Manager", async ({ page }) => {
    await openPaletteViaSidebar(page);
    await expect(
      page.locator("#command-palette-list").getByText("Open Export Manager")
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("command palette search filters to security items", async ({ page }) => {
    await openPaletteViaSidebar(page);
    // Use pressSequentially to reliably trigger React controlled input onChange
    await page.locator("#command-palette-input").pressSequentially("security");
    await expect(
      page.locator("#command-palette-list").getByText("Open Security Center")
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("clicking Open Security Center in palette navigates to security view", async ({ page }) => {
    const app = new AppPage(page);
    await openPaletteViaSidebar(page);
    // Click the command item directly — more reliable than keyboard Enter after pressSequentially
    await page.locator("#command-palette-list .command-palette-item")
      .filter({ hasText: "Open Security Center" })
      .first()
      .click();
    await expect(page.getByTestId("view-security")).toHaveClass(/active/);
  });
});
