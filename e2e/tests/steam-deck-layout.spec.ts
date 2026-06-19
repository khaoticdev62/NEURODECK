import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage";
import {
  STEAM_DECK_SCREENS,
  STEAM_DECK_VIEWPORT,
  auditSteamDeckScreen,
  collectRuntimeDiagnostics,
  expectCleanSteamDeckAudit,
  openSteamDeckScreen,
} from "../support/steam-deck-audit";

test.describe("Steam Deck readiness — 1280×800", () => {
  test.use({ viewport: STEAM_DECK_VIEWPORT });

  for (const screen of STEAM_DECK_SCREENS) {
    test(`screen: ${screen.id} — geometry, runtime and content audit`, async ({ page }, testInfo) => {
      const runtime = collectRuntimeDiagnostics(page);
      const app = new AppPage(page);
      await app.mockTauriBackend();
      await app.goto();
      await openSteamDeckScreen(app, screen);
      await app.stabilizeForScreenshot();

      const viewport = page.viewportSize();
      expect(viewport).toEqual(STEAM_DECK_VIEWPORT);
      await expect(page.locator(screen.root)).toBeVisible();
      await testInfo.attach(`steam-deck-${screen.id}.png`, {
        body: await page.screenshot({ fullPage: false }),
        contentType: "image/png",
      });

      const report = await auditSteamDeckScreen(page, screen, runtime, testInfo);
      expectCleanSteamDeckAudit(report);
    });
  }

  test("primary navigation supports focus, Enter and visible focus", async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();

    const chat = page.getByTestId("nav-tab-chat").filter({ visible: true }).first();
    await chat.focus();
    await expect(chat).toBeFocused();
    const focusStyle = await chat.evaluate((element) => {
      const style = getComputedStyle(element);
      return { outline: style.outlineStyle, width: style.outlineWidth, shadow: style.boxShadow };
    });
    expect(
      focusStyle.outline !== "none" && focusStyle.width !== "0px" || focusStyle.shadow !== "none",
      "focused navigation must have a visible outline or focus shadow",
    ).toBe(true);

    await page.getByTestId("nav-tab-memory").filter({ visible: true }).first().focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("view-memory")).toHaveClass(/active/);
  });

  test("settings traps focus and Escape restores it", async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();

    await app.settingsBtn.focus();
    await app.settingsBtn.press("Enter");
    await expect(app.settingsOverlay).toHaveClass(/active/);
    await page.keyboard.press("Tab");
    const focusInside = await page.evaluate(() =>
      Boolean(document.activeElement?.closest("#settings-overlay")));
    expect(focusInside, "settings focus must stay inside the modal").toBe(true);
    await page.keyboard.press("Escape");
    await expect(app.settingsOverlay).not.toHaveClass(/active/);
    await expect(app.settingsBtn).toBeFocused();
  });

  test("controller mode remains inside the viewport and exposes named hints", async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();
    await app.setDeckMode(true);
    await expect(app.controllerHintBar).toBeVisible();
    const rect = await app.controllerHintBar.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(STEAM_DECK_VIEWPORT.height);
    const unnamed = await app.controllerHintBar
      .locator("button:not([aria-label])")
      .count();
    expect(unnamed).toBe(0);
  });
});
