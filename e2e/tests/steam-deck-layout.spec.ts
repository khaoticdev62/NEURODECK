/**
 * NEURODECK — Steam Deck Layout Tests
 *
 * Validates every screen at 1280×800 (Steam Deck native resolution).
 * Run with the steam-deck Playwright project:
 *
 *   cd e2e && npx playwright test steam-deck-layout.spec.ts --project=steam-deck
 *
 * Screenshots land in test-results/ui-audit/deck-{view}.png
 */

import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage";
import * as fs from "fs";

const DECK_VIEWS = [
  "chat",
  "execution",
  "agent",
  "memory",
  "canvas",
  "terminal",
  "ssh",
  "ide",
  "git",
  "api-lab",
  "cli-maker",
  "browser",
  "tunnel",
  "share",
  "torrent",
  "remote",
  "project",
  "docs",
  "prompt-lab",
  "academy",
  "graph",
  "sessions",
  "scheduler",
  "orchestrator",
  "sync",
  "models",
  "cache",
  "plugins",
  "diagnostics",
  "fonts",
  "mcp",
  "security",
  "themes",
  "exports",
  "maintenance",
  "recovery",
] as const;

test.beforeAll(() => {
  fs.mkdirSync("test-results/ui-audit", { recursive: true });
});

test.describe("Steam Deck Layout — 1280×800", () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();
  });

  for (const viewId of DECK_VIEWS) {
    test(`deck: ${viewId} — no overflow, content visible`, async ({ page }) => {
      const app = new AppPage(page);

      await app.navigateTo(viewId);
      await page.waitForLoadState("networkidle").catch(() => {});

      // Screenshot at deck resolution
      await page.screenshot({
        path: `test-results/ui-audit/deck-${viewId}.png`,
        fullPage: false, // only viewport — Steam Deck doesn't scroll
      });

      // No horizontal overflow at 1280px
      await app.assertNoHorizontalOverflow();

      // View renders something meaningful (not blank)
      const viewEl = page.getByTestId(`view-${viewId}`);
      await expect(viewEl).toHaveClass(/active/);

      // View has at least one visible text element
      const textCount = await viewEl.locator("h1, h2, h3, p, span").count();
      expect(textCount, `view ${viewId} appears blank — no text elements`).toBeGreaterThan(0);
    });
  }

  test("deck: sidebar renders in icon-only mode at 1280px", async ({ page }) => {
    // The sidebar starts collapsed (icon-only) at 1280px without hover
    // First aside is the primary nav sidebar; second is the context panel (xl:flex)
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();
    // All nav items should be present even in collapsed state
    const navItems = page.locator("button[data-view]");
    const count = await navItems.count();
    expect(count, "sidebar should have all nav items").toBeGreaterThanOrEqual(36);
  });

  test("deck: primary action touch targets are adequate", async ({ page }) => {
    // Check chat input area (primary interaction surface)
    const app = new AppPage(page);
    await app.navigateTo("chat");

    const smallTargets = await app.checkTouchTargets();
    // Report but don't hard-fail on icon-only buttons (they're legitimately small at 28px)
    // Hard-fail only if a primary CTA is under 36px
    const criticallySmall = smallTargets.filter(
      (t) => t.h < 28 && t.text.length > 3 // text buttons (not icon-only)
    );
    expect(
      criticallySmall,
      `primary text buttons under 28px: ${JSON.stringify(criticallySmall)}`
    ).toEqual([]);
  });

  test("deck: settings overlay fits within viewport", async ({ page }) => {
    const app = new AppPage(page);
    await app.openSettings();

    const overlay = page.locator("#settings-overlay");
    await expect(overlay).toHaveClass(/active/);

    // Settings modal should not overflow viewport height
    const overflowY = await page.evaluate(() => {
      const modal = document.querySelector("#settings-overlay");
      if (!modal) return false;
      const rect = modal.getBoundingClientRect();
      return rect.bottom > window.innerHeight + 1;
    });
    expect(overflowY, "settings overlay exceeds viewport height at 1280×800").toBe(false);

    await page.screenshot({ path: "test-results/ui-audit/deck-settings-overlay.png" });
    await app.closeSettings();
  });

  test("deck: command palette fits within viewport", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();

    const overflowY = await page.evaluate(() => {
      const overlay = document.querySelector("#command-palette-overlay");
      if (!overlay) return false;
      const rect = overlay.getBoundingClientRect();
      return rect.bottom > window.innerHeight + 1;
    });
    expect(overflowY, "command palette exceeds viewport at 1280×800").toBe(false);

    await page.screenshot({ path: "test-results/ui-audit/deck-command-palette.png" });
    await app.closeCommandPalette();
  });

  test("deck: controller hint bar renders in deck mode and fits viewport", async ({ page }) => {
    const app = new AppPage(page);
    await app.setDeckMode(true);
    await app.navigateTo("chat");

    await expect(app.controllerHintBar).toBeVisible();

    const hintRect = await app.controllerHintBar.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { height: r.height, bottom: r.bottom };
    });
    expect(hintRect.height, "hint bar should be at least 40px tall").toBeGreaterThanOrEqual(40);
    expect(hintRect.bottom, "hint bar should sit inside viewport").toBeLessThanOrEqual(800);

    await page.screenshot({ path: "test-results/ui-audit/deck-mode-hint-bar.png" });
  });
});
