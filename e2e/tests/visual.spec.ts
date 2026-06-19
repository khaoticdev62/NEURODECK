import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage";
import {
  STEAM_DECK_SCREENS,
  STEAM_DECK_VIEWPORT,
  openSteamDeckScreen,
} from "../support/steam-deck-audit";

test.describe("Steam Deck visual regression — reviewed 1280×800 baselines", () => {
  test.use({ viewport: STEAM_DECK_VIEWPORT });

  for (const screen of STEAM_DECK_SCREENS) {
    test(`visual: ${screen.id} at 1280×800`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== "steam-deck",
        "Canonical visual baselines are captured only by the Steam Deck project.",
      );

      const app = new AppPage(page);
      await app.mockTauriBackend();
      await app.goto();
      await openSteamDeckScreen(app, screen);
      await app.stabilizeForScreenshot();

      await expect(page).toHaveScreenshot(`${screen.id}-1280x800.png`, {
        animations: "disabled",
        caret: "hide",
        fullPage: false,
        // The Settings glass overlay composites the entire underlying view.
        // Allow its reviewed antialias envelope without relaxing other screens.
        maxDiffPixelRatio: screen.id === "settings" ? 0.003 : 0.002,
        scale: "css",
        // Chromium's translucent overlays can vary by a few RGB levels at
        // text and rounded-edge boundaries while preserving exact geometry.
        threshold: 0.3,
      });
    });
  }
});
