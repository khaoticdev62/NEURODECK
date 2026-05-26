import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { AppPage } from "../pages/AppPage";

test.beforeEach(async ({ page }) => {
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();
});

const viewTabs = [
  { id: "chat", name: "Chat" },
  { id: "canvas", name: "Canvas" },
  { id: "terminal", name: "Terminal" },
  { id: "ssh", name: "SSH" },
  { id: "tunnel", name: "Tunnel" },
  { id: "share", name: "Share" },
  { id: "browser", name: "Browser" },
  { id: "agent", name: "Agent" },
  { id: "memory", name: "Memory" },
  { id: "prompt-lab", name: "Prompt Lab" },
  { id: "remote", name: "Remote" },
  { id: "docs", name: "Docs" },
];

for (const view of viewTabs) {
  test.fixme(`a11y audit on ${view.name} view`, async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo(view.id);

    const axe = new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .disableRules(["color-contrast"]);

    const results = await axe.analyze();

    if (results.violations.length > 0) {
      console.log(`\n[${view.name}] A11y violations: ${results.violations.length}`);
      for (const v of results.violations) {
        console.log(`  - ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
        for (const node of v.nodes.slice(0, 3)) {
          console.log(`      ${node.target.join(", ")}`);
        }
      }
    }

    const hardFail = results.violations.filter(
      (v) => (v.impact === "critical" || v.impact === "serious") && v.id !== "color-contrast"
    );
    expect(hardFail).toEqual([]);
  });
}

test.fixme("a11y audit on settings modal", async ({ page }) => {
  const app = new AppPage(page);
  await app.openSettings();

  const axe = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .disableRules(["color-contrast"]);

  const results = await axe.analyze();

  const hardFail = results.violations.filter(
    (v) => (v.impact === "critical" || v.impact === "serious") && v.id !== "color-contrast"
  );
  expect(hardFail).toEqual([]);
});

test.fixme("a11y audit on command palette", async ({ page }) => {
  const app = new AppPage(page);
  await app.openCommandPalette();

  const axe = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .disableRules(["color-contrast"]);

  const results = await axe.analyze();

  const hardFail = results.violations.filter(
    (v) => (v.impact === "critical" || v.impact === "serious") && v.id !== "color-contrast"
  );
  expect(hardFail).toEqual([]);
});

test.fixme("a11y audit on shortcuts overlay", async ({ page }) => {
  const app = new AppPage(page);
  await app.openShortcuts();

  const axe = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .disableRules(["color-contrast"]);

  const results = await axe.analyze();

  const hardFail = results.violations.filter(
    (v) => (v.impact === "critical" || v.impact === "serious") && v.id !== "color-contrast"
  );
  expect(hardFail).toEqual([]);
});
