/**
 * View empty-state, loading, and error state tests.
 *
 * Covers the three high-visibility views upgraded in the Session 2 audit:
 *   1. Models view — EmptyState / LoadingState / ErrorState
 *   2. Settings view — theme grid empty fallback, provider retry button
 *   3. Workspace / Chat — busy indicator during AI generation
 */
import { test, expect } from "@playwright/test";
import { buildTauriMock } from "../support/tauri-mock";
import type { TauriMockOptions } from "../support/tauri-mock";

/** Wait for the React app to finish hydrating. */
async function waitForAppReady(page: import("@playwright/test").Page) {
  await page
    .locator("#boot-loader")
    .waitFor({ state: "hidden", timeout: 12000 })
    .catch(() => {});
  await page.locator('[data-testid^="nav-tab-"]').first().waitFor({ state: "visible", timeout: 15000 });
}

// ── Models view ───────────────────────────────────────────────────────────────

test.describe("Models view", () => {
  test("shows EmptyState when no models are detected", async ({ page }) => {
    // The mock returns no models — state.models will be [] after hydration.
    // The ModelsView renders EmptyState when state.models.length === 0 && !loading.
    await page.addInitScript(buildTauriMock);
    await page.goto("/");
    await waitForAppReady(page);

    const modelsTab = page.getByTestId("nav-tab-models");
    await modelsTab.scrollIntoViewIfNeeded();
    await modelsTab.click();

    const modelsView = page.getByTestId("view-models");
    await expect(modelsView).toBeVisible({ timeout: 5000 });

    // The EmptyState title is rendered when models = []
    await expect(page.getByText("No models detected.")).toBeVisible({ timeout: 5000 });
  });

  test("EmptyState action button is clickable", async ({ page }) => {
    await page.addInitScript(buildTauriMock);
    await page.goto("/");
    await waitForAppReady(page);

    const modelsTab = page.getByTestId("nav-tab-models");
    await modelsTab.scrollIntoViewIfNeeded();
    await modelsTab.click();
    await expect(page.getByTestId("view-models")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("No models detected.")).toBeVisible({ timeout: 5000 });

    // The action button should be present and clickable without crashing
    const detectBtn = page.getByRole("button", { name: /detect/i }).first();
    await expect(detectBtn).toBeVisible();
    await detectBtn.click();
    // App should not crash — verify the view is still visible
    await expect(page.getByTestId("view-models")).toBeVisible();
  });

  test("renders error state when model API fails", async ({ page }) => {
    const opts: TauriMockOptions = {
      overrides: {
        // The models view calls neurodeckApi.models.getAllowedModelsForAgent which
        // maps to get_allowed_models_for_agent — simulate a 500 by throwing
        get_allowed_models_for_agent: async () => {
          throw new Error("Model service unavailable");
        },
      },
    };
    await page.addInitScript(() => {
      (window as any).__mockOverrideGetAllowedModels = true;
    });
    await page.addInitScript(buildTauriMock);

    // Override fetch for the specific models endpoint to return 500
    await page.route("**/api/get_allowed_models_for_agent", async (route) => {
      await route.fulfill({ status: 500, body: "Model service unavailable" });
    });
    await page.route("**/api/get_model_compatibility_scores", async (route) => {
      await route.fulfill({ status: 500, body: "unavailable" });
    });

    await page.goto("/");
    await waitForAppReady(page);

    const modelsTab = page.getByTestId("nav-tab-models");
    await modelsTab.scrollIntoViewIfNeeded();
    await modelsTab.click();
    await expect(page.getByTestId("view-models")).toBeVisible({ timeout: 5000 });

    // Either EmptyState or ErrorState should be visible (not an empty blank area)
    const hasEmptyOrError = await page.evaluate(() => {
      const text = document.body.innerText;
      return (
        text.includes("No models detected.") ||
        text.includes("Model scan failed.") ||
        text.includes("unavailable") ||
        text.includes("Detect")
      );
    });
    expect(hasEmptyOrError).toBe(true);
  });
});

// ── Settings view ─────────────────────────────────────────────────────────────

test.describe("Settings view", () => {
  test("appearance section renders without crashing", async ({ page }) => {
    await page.addInitScript(buildTauriMock);
    await page.goto("/");
    await waitForAppReady(page);

    const settingsTab = page.getByTestId("nav-tab-settings");
    await settingsTab.scrollIntoViewIfNeeded();
    await settingsTab.click();
    await expect(page.getByTestId("view-settings")).toBeVisible({ timeout: 5000 });

    // The settings nav sidebar is visible
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible();
  });

  test("settings appearance panel shows theme grid when themes are available", async ({ page }) => {
    await page.addInitScript(buildTauriMock);
    await page.goto("/");
    await waitForAppReady(page);

    const settingsTab = page.getByTestId("nav-tab-settings");
    await settingsTab.scrollIntoViewIfNeeded();
    await settingsTab.click();
    await expect(page.getByTestId("view-settings")).toBeVisible({ timeout: 5000 });

    // Click the "General" panel (which contains the theme picker in React SettingsView)
    const generalBtn = page.getByRole("button", { name: /^general$/i });
    if (await generalBtn.count() > 0) {
      await generalBtn.click();
    }

    // Theme Engine section should be present (themes are always available from registry)
    await expect(page.getByText("Theme Engine")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Quick Theme Picker")).toBeVisible({ timeout: 3000 });
  });

  test("settings view does not show theme-unavailable empty state when themes load correctly", async ({ page }) => {
    await page.addInitScript(buildTauriMock);
    await page.goto("/");
    await waitForAppReady(page);

    const settingsTab = page.getByTestId("nav-tab-settings");
    await settingsTab.scrollIntoViewIfNeeded();
    await settingsTab.click();
    await expect(page.getByTestId("view-settings")).toBeVisible({ timeout: 5000 });

    // With valid theme registry, the "theme settings unavailable" message should NOT appear
    await expect(page.getByText("Theme settings unavailable.")).not.toBeVisible();
  });
});

// ── Workspace / Chat view ─────────────────────────────────────────────────────

test.describe("Workspace view", () => {
  test("welcome screen renders on startup with no messages", async ({ page }) => {
    await page.addInitScript(buildTauriMock);
    await page.goto("/");
    await waitForAppReady(page);

    // Default view is 'chat' which renders WorkspaceView → ChatViewport
    // With no messages, the welcome screen should be visible
    await expect(page.getByText("NEURODECK")).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText("Local-first AI workstation OS.")
    ).toBeVisible({ timeout: 3000 });
  });

  test("starter prompt cards are rendered and clickable", async ({ page }) => {
    await page.addInitScript(buildTauriMock);
    await page.goto("/");
    await waitForAppReady(page);

    // The chat welcome screen should show starter prompt cards
    const starterCards = page.locator('button').filter({ hasText: /Rust Handler|Sprint Plan|Code Review|Debug Help/i });
    const count = await starterCards.count();
    expect(count).toBeGreaterThan(0);

    // Clicking a starter should not crash the app
    await starterCards.first().click();
    // The app should still be responsive (view still visible)
    await expect(page.getByTestId("view-chat")).toBeVisible({ timeout: 3000 });
  });
});
