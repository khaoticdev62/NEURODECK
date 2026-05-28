import fs from "fs";
import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Universal Design System", () => {
  const indexHtmlPath = path.resolve(__dirname, "../../../design-system/index.html");
  const fileUrl = `file://${indexHtmlPath}`;
  const hasDesignSystemApp = fs.existsSync(indexHtmlPath);

  test.skip(!hasDesignSystemApp, "design-system/index.html is not present in this repo");

  test("should complete the cinematic boot sequence", async ({ page }) => {
    await page.goto(fileUrl);

    // Verify boot screen overlay is active initially
    const bootOverlay = page.locator("#boot-overlay");
    await expect(bootOverlay).toBeVisible();

    // Wait for boot diagnostics sequence to complete (it takes ~2 seconds)
    // After boot completes, #boot-overlay is removed from the DOM.
    await expect(bootOverlay).toBeHidden({ timeout: 5000 });
  });

  test("should toggle the collapsible sidebar", async ({ page }) => {
    await page.goto(fileUrl);
    
    // Wait for boot screen to clear
    await page.waitForSelector("#boot-overlay", { state: "detached", timeout: 5000 });

    const sidebar = page.locator("#sidebar");
    const closeBtn = page.locator("#sidebar-close-btn");
    const toggleBtn = page.locator("#sidebar-toggle-btn");

    // Initially sidebar is expanded (no collapsed class)
    await expect(sidebar).not.toHaveClass(/collapsed/);

    // Collapse the sidebar
    await closeBtn.click();
    await expect(sidebar).toHaveClass(/collapsed/);

    // Expand it again
    await toggleBtn.click();
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });

  test("should switch tab views and update breadcrumbs", async ({ page }) => {
    await page.goto(fileUrl);
    await page.waitForSelector("#boot-overlay", { state: "detached", timeout: 5000 });

    const chatView = page.locator("#view-chat");
    const gridView = page.locator("#view-grid");
    const gridTab = page.locator("button.nav-tab:has-text('Grid Metrics')");
    const breadcrumbView = page.locator("#breadcrumb-view");

    // Default view is chat
    await expect(chatView).toHaveClass(/active/);
    await expect(gridView).not.toHaveClass(/active/);
    await expect(breadcrumbView).toHaveText("Chat Console");

    // Switch to Grid Metrics view
    await gridTab.click();
    await expect(chatView).not.toHaveClass(/active/);
    await expect(gridView).toHaveClass(/active/);
    await expect(breadcrumbView).toHaveText("Grid Metrics");
  });

  test("should switch visual themes from settings", async ({ page }) => {
    await page.goto(fileUrl);
    await page.waitForSelector("#boot-overlay", { state: "detached", timeout: 5000 });

    const body = page.locator("body");
    const settingsBtn = page.locator("#settings-btn");
    const settingsOverlay = page.locator("#settings-modal-overlay");

    // Verify default theme is blacksite
    await expect(body).toHaveClass(/theme-blacksite/);

    // Open settings modal
    await settingsBtn.click();
    await expect(settingsOverlay).toHaveClass(/active/);

    // Select Synthwave theme preset
    const synthThemeCard = page.locator("[data-preset='SYNTH_GRID']");
    await synthThemeCard.click();

    // Verify theme class swapped on body
    await expect(body).not.toHaveClass(/theme-blacksite/);
    await expect(body).toHaveClass(/theme-synthgrid/);
  });
});
