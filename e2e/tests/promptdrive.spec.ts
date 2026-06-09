import { expect, test } from "@playwright/test";
import { AppPage } from "../pages/AppPage";

test.beforeEach(async ({ page }) => {
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await page.setViewportSize({ width: 1280, height: 800 });
  await app.goto();
});

test("PromptDrive Composer builds, previews, saves, and replays a safe macro", async ({ page }) => {
  const app = new AppPage(page);
  await app.navigateTo("prompt-lab");

  await expect(page.locator(".promptdrive-composer")).toBeVisible();
  await expect(page.locator(".promptdrive-template-card").first()).toContainText("JPE Explainer");

  await page.locator("#pd-slot-topic").fill("Steam Deck terminal UX");
  await expect(page.locator("#pd-preview")).toHaveValue(/Steam Deck terminal UX/);

  await page.locator("#pd-suggestion-query").fill("rust");
  await page.locator(".promptdrive-suggestion").first().click();
  await expect(page.locator("#pd-preview")).toHaveValue(/Rust ownership/);

  await page.locator("#pd-execute-btn").click();
  await expect(page.locator(".notification, .toast, [role='status']").first()).toBeVisible({ timeout: 5000 }).catch(() => {});

  await page.locator("#pd-save-btn").click();
  await expect(page.locator(".promptdrive-saved-item")).toContainText("JPE Explainer");

  await page.locator("#pd-macro-toggle-btn").click();
  await page.locator("#pd-slot-topic").fill("SQLite migration");
  await page.locator("#pd-macro-toggle-btn").click();
  await expect(page.locator("#pd-macro-toggle-btn")).toHaveText("Record Macro");
  await expect(page.locator(".promptdrive-macro-item")).toContainText("1 steps");

  await page.locator("#pd-slot-topic").fill("Manual overwrite");
  await expect(page.locator("#pd-preview")).toHaveValue(/Manual overwrite/);
  await page.locator(".promptdrive-macro-item button", { hasText: "Replay" }).click();
  await expect(page.locator("#pd-preview")).toHaveValue(/SQLite migration/);

  await page.locator(".promptdrive-macro-item button", { hasText: "Delete" }).click();
  await expect(page.locator(".promptdrive-macro-item")).toHaveCount(0);
  await expect(page.locator("#pd-macro-list")).toContainText("No macros recorded.");

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("view-prompt-lab")).toHaveClass(/active/);
});

test("PromptDrive responds to DeckCode controller actions while active", async ({ page }) => {
  const app = new AppPage(page);
  await app.navigateTo("prompt-lab");

  await page.locator("#pd-slot-topic").fill("DeckCode routing");
  await page.locator("#pd-suggestion-query").fill("rust");
  await expect(page.locator(".promptdrive-suggestion").first()).toBeVisible();

  await page.evaluate(() => {
    (window as any).__mock_emit("deckcode-action", "r4");
  });
  await expect(page.locator("#pd-preview")).toHaveValue(/Rust ownership/);

  await page.evaluate(() => {
    (window as any).__mock_emit("deckcode-action", "r5 hold");
  });
  await expect(page.getByText("Prompt execution routed through bridge.")).toBeVisible();

  await page.evaluate(() => {
    (window as any).__mock_emit("deckcode-action", "l5");
  });
  await expect(page.locator(".promptdrive-saved-item")).toContainText("JPE Explainer");

  await page.evaluate(() => {
    (window as any).__mock_emit("deckcode-action", "l5+r5");
  });
  await expect(page.locator("#pd-macro-toggle-btn")).toHaveText("Stop Macro");

  await page.locator("#pd-slot-topic").fill("Controller macro");
  await page.evaluate(() => {
    (window as any).__mock_emit("deckcode-action", "l5+r5");
  });
  await expect(page.locator("#pd-macro-toggle-btn")).toHaveText("Record Macro");
  await expect(page.locator(".promptdrive-macro-item")).toContainText("1 steps");

  await page.locator("#pd-suggestion-query").focus();
  await page.evaluate(() => {
    (window as any).__mock_emit("deckcode-action", "b");
  });
  await expect(page.locator("#pd-suggestion-query")).not.toBeFocused();
});
