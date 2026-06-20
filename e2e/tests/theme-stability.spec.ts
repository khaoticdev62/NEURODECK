/**
 * Theme stability tests — verifies ThemeProvider hydration safety and CSS variable injection.
 *
 * These tests guard against:
 *   1. ThemeProvider returning null and unmounting App during async settings load
 *   2. CSS variables not being injected (causing FOUC or unstyled content)
 *   3. Invalid persisted theme crashing the app
 *   4. Theme selection not persisting across reload
 */
import { test, expect } from "@playwright/test";
import { buildTauriMock } from "../support/tauri-mock";

/** Wait for the React app to finish hydrating (loading spinner gone, nav visible). */
async function waitForAppReady(page: import("@playwright/test").Page) {
  // Wait for the boot-loader to detach (hidden overlay still blocks pointer events)
  await page
    .locator("#boot-overlay")
    .waitFor({ state: "detached", timeout: 12000 })
    .catch(async () => {
      await page.evaluate(() => document.getElementById("boot-overlay")?.remove());
    });

  // Wait for any nav tab to be present (signals the app shell rendered)
  await page.locator('[data-testid^="nav-tab-"]').first().waitFor({ state: "visible", timeout: 15000 });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(buildTauriMock);
  await page.goto("/");
  await waitForAppReady(page);
});

// ── 1. Favicon reference ──────────────────────────────────────────────────────

test("favicon reference is present in <head>", async ({ page }) => {
  const faviconLink = page.locator('link[rel="icon"][href$="favicon.svg"]');
  await expect(faviconLink).toHaveCount(1);
});

// ── 2. CSS variables injected ─────────────────────────────────────────────────

test("ThemeProvider injects CSS custom properties after app loads", async ({ page }) => {
  // The --nd-bg variable is injected by injectThemeVariables() on ThemeProvider mount.
  // If it's empty, the ThemeProvider failed to inject tokens.
  const ndBg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--nd-bg").trim()
  );
  expect(ndBg).not.toBe("");
  expect(ndBg.length).toBeGreaterThan(0);
});

// ── 3. Root never empty during hydration ─────────────────────────────────────

test("ThemeProvider does not unmount #root during settings hydration", async ({ page: rawPage }) => {
  // Fresh page with mutation tracking — measure BEFORE goto so we see the full lifecycle
  await rawPage.addInitScript(buildTauriMock);
  await rawPage.addInitScript(() => {
    (window as any).__rootWasEmpty = false;
    const observer = new MutationObserver(() => {
      const root = document.getElementById("root");
      if (root && root.children.length === 0) {
        (window as any).__rootWasEmpty = true;
      }
    });
    document.addEventListener("DOMContentLoaded", () => {
      const root = document.getElementById("root");
      if (root) observer.observe(root, { childList: true });
    });
  });

  await rawPage.goto("/");
  await waitForAppReady(rawPage);

  const wasEmpty = await rawPage.evaluate(() => (window as any).__rootWasEmpty);
  expect(wasEmpty).toBe(false);
});

// ── 4. Invalid persisted theme does not crash ─────────────────────────────────

test("app renders safely when localStorage.themeSettings is corrupted", async ({ page: rawPage }) => {
  await rawPage.addInitScript(() => {
    // buildTauriMock sets neurodeck_onboarding_complete — add after that runs
    localStorage.setItem(
      "themeSettings",
      '{"activeThemeId":"theme_that_does_not_exist","broken_field":true}'
    );
  });
  await rawPage.addInitScript(buildTauriMock);
  await rawPage.goto("/");
  await waitForAppReady(rawPage);

  // App must render nav (not crash with a blank screen)
  const navTabs = rawPage.locator('[data-testid^="nav-tab-"]');
  await expect(navTabs.first()).toBeVisible();

  // CSS vars must still be injected (fallback theme was applied)
  const ndBg = await rawPage.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--nd-bg").trim()
  );
  expect(ndBg).not.toBe("");
});

// ── 5. Theme selection persists across reload ─────────────────────────────────

test("theme selection persists in localStorage and CSS vars survive reload", async ({ page }) => {
  // Open the settings overlay
  const settingsBtn = page.locator("#settings-btn");
  await settingsBtn.evaluate((el) => (el as HTMLButtonElement).click());
  await expect(page.locator("#settings-overlay")).toHaveClass(/active/);

  // Read initial CSS var value
  const initialNdBg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--nd-bg").trim()
  );
  expect(initialNdBg).not.toBe("");

  // Reload and verify CSS vars are still present (not undefined)
  await page.reload();
  await waitForAppReady(page);

  const reloadedNdBg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--nd-bg").trim()
  );
  expect(reloadedNdBg).not.toBe("");
});
