import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { AppPage } from "../pages/AppPage";
import {
  STEAM_DECK_SCREENS,
  STEAM_DECK_VIEWPORT,
  openSteamDeckScreen,
} from "../support/steam-deck-audit";

test.describe("Steam Deck accessibility — WCAG 2.1 AA", () => {
  test.use({ viewport: STEAM_DECK_VIEWPORT });

  for (const screen of STEAM_DECK_SCREENS) {
    test(`a11y: ${screen.id}`, async ({ page }, testInfo) => {
      const app = new AppPage(page);
      await app.mockTauriBackend();
      await app.goto();
      await openSteamDeckScreen(app, screen);
      await app.stabilizeForScreenshot();

      const results = await new AxeBuilder({ page })
        .include(screen.root)
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();

      await testInfo.attach(`axe-${screen.id}.json`, {
        body: Buffer.from(JSON.stringify(results.violations, null, 2)),
        contentType: "application/json",
      });

      const blockers = results.violations.filter(
        (violation) => violation.impact === "critical" || violation.impact === "serious",
      );
      expect(
        blockers,
        blockers.map((violation) =>
          `${violation.id}: ${violation.help} — ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
        ).join("\n"),
      ).toEqual([]);
    });
  }
});
