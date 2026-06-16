/**
 * NEURODECK — UI Screen Audit
 *
 * Playwright spec that visits every reachable screen, screenshots it, and
 * asserts fundamental quality gates (no crash, no horizontal overflow, no
 * console errors). Run after `npm run frontend:build`.
 *
 *   cd e2e && npx playwright test ui-screen-audit.spec.ts
 *   cd e2e && npx playwright test ui-screen-audit.spec.ts --project=steam-deck
 *
 * Screenshots land in test-results/ui-audit/{view}.png
 */

import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage";
import * as fs from "fs";
import * as path from "path";

// All view IDs registered in App.tsx (matches data-view on nav buttons)
const SIDEBAR_VIEWS = [
  // Mission Control
  "chat",
  "execution",
  "agent",
  "memory",
  // Dev Tools
  "canvas",
  "terminal",
  "ssh",
  "ide",
  "git",
  "api-lab",
  "cli-maker",
  // Network
  "browser",
  "tunnel",
  "share",
  "torrent",
  "remote",
  // Knowledge
  "project",
  "docs",
  "prompt-lab",
  "academy",
  "graph",
  "sessions",
  // Automation
  "scheduler",
  "orchestrator",
  "sync",
  // System
  "models",
  "cache",
  "plugins",
  "diagnostics",
  "settings",
  "fonts",
  // Integrations (was missing from sidebar sectionOrder — now fixed)
  "mcp",
  // Security & Ops
  "security",
  "themes",
  "exports",
  "maintenance",
  "recovery",
] as const;

// Ensure screenshot output dir exists before tests run
test.beforeAll(() => {
  const dir = path.join(process.cwd(), "test-results", "ui-audit");
  fs.mkdirSync(dir, { recursive: true });
});

test.describe("UI Screen Audit — All Views", () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();
  });

  for (const viewId of SIDEBAR_VIEWS) {
    test(`screen: ${viewId} — loads, no overflow, no crash`, async ({ page }) => {
      const app = new AppPage(page);
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await app.navigateTo(viewId);

      // Wait for lazy-loaded view to settle
      await page.waitForLoadState("networkidle").catch(() => {});

      // Screenshot
      await page.screenshot({
        path: `test-results/ui-audit/${viewId}.png`,
        fullPage: true,
      });

      // 1. View container is visible and active
      await expect(page.getByTestId(`view-${viewId}`)).toHaveClass(/active/);

      // 2. No horizontal overflow
      await app.assertNoHorizontalOverflow();

      // 3. No console errors (filter expected network errors without sidecar)
      app.assertNoConsoleErrors(consoleErrors);
    });
  }
});

test.describe("UI Screen Audit — Overlay States", () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();
  });

  test("command palette opens and renders", async ({ page }) => {
    const app = new AppPage(page);
    const dir = path.join(process.cwd(), "test-results", "ui-audit");
    fs.mkdirSync(dir, { recursive: true });

    await app.openCommandPalette();
    await expect(page.locator("#command-palette-overlay")).toHaveClass(/active/);
    await page.screenshot({ path: "test-results/ui-audit/overlay-command-palette.png" });
    await app.closeCommandPalette();
  });

  test("settings overlay opens and renders", async ({ page }) => {
    const app = new AppPage(page);
    const dir = path.join(process.cwd(), "test-results", "ui-audit");
    fs.mkdirSync(dir, { recursive: true });

    await app.openSettings();
    await expect(page.locator("#settings-overlay")).toHaveClass(/active/);
    await page.screenshot({ path: "test-results/ui-audit/overlay-settings.png" });
    await app.closeSettings();
  });

  test("notifications panel opens and renders", async ({ page }) => {
    const app = new AppPage(page);
    const dir = path.join(process.cwd(), "test-results", "ui-audit");
    fs.mkdirSync(dir, { recursive: true });

    await app.openNotifications();
    await expect(page.locator("#notif-modal")).toHaveClass(/active/);
    await page.screenshot({ path: "test-results/ui-audit/overlay-notifications.png" });
  });

  test("keyboard shortcuts overlay opens and renders", async ({ page }) => {
    const app = new AppPage(page);
    const dir = path.join(process.cwd(), "test-results", "ui-audit");
    fs.mkdirSync(dir, { recursive: true });

    await app.openShortcuts();
    await page.screenshot({ path: "test-results/ui-audit/overlay-shortcuts.png" });
  });

  test("quick switcher overlay opens and renders", async ({ page }) => {
    const app = new AppPage(page);
    const dir = path.join(process.cwd(), "test-results", "ui-audit");
    fs.mkdirSync(dir, { recursive: true });

    await app.openQuickSwitcher();
    await expect(page.locator("#quick-switcher-overlay")).toHaveClass(/active/);
    await page.screenshot({ path: "test-results/ui-audit/overlay-quick-switcher.png" });
    await app.closeQuickSwitcher();
  });
});

test.describe("UI Screen Audit — Design System Assertions", () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();
  });

  test("no duplicate navigation labels in sidebar", async ({ page }) => {
    const labels = await page
      .locator("nav[aria-label='Main navigation'] button[data-view]")
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLElement).getAttribute("aria-label") ?? "")
      );
    const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
    expect(dupes, `duplicate nav labels: ${dupes.join(", ")}`).toEqual([]);
  });

  test('no "tauri" text visible in the UI on landing', async ({ page }) => {
    const app = new AppPage(page);
    await app.assertNoTauriText();
  });

  test("no placeholder/coming-soon text on landing screen", async ({ page }) => {
    const app = new AppPage(page);
    await app.assertNoPlaceholderText();
  });

  test("sidebar has MCP Server nav item (Integrations section fix)", async ({ page }) => {
    await expect(page.locator('button[data-view="mcp"]')).toBeVisible();
  });

  test("all nav items have accessible aria-label", async ({ page }) => {
    const navBtns = await page
      .locator("nav[aria-label='Main navigation'] button[data-view]")
      .all();
    for (const btn of navBtns) {
      const label = await btn.getAttribute("aria-label");
      expect(label, `nav button missing aria-label`).toBeTruthy();
    }
  });
});
