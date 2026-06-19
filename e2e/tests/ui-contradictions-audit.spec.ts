/**
 * NEURODECK — UI Contradictions Audit
 *
 * Playwright spec that locates layer contradictions between the legacy CSS,
 * design-system tokens, Tailwind config, and React components. It should fail
 * when the UI has conflicting token/z-index/hit-target/focus-trap issues and
 * pass once those contradictions are resolved.
 *
 * Run:
 *   cd e2e && npx playwright test ui-contradictions-audit.spec.ts --project chromium-desktop
 */

import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage";

const INVALID_CLASS_PATTERNS = [
  "nd-surface-bg",      // Tailwind does not generate this; should be nd-bg
  "nd-status-warning",  // Tailwind does not generate this; should be nd-warning
  "nd-accent-danger",   // Tailwind does not generate this; should be nd-accent-error
  "nd-purple-400",      // Tailwind does not generate this; should be nd-accent-agent or arbitrary var
];

const DS_Z_TOKENS: Record<string, string> = {
  "--nd-z-modal": "9990",
  "--nd-z-overlay": "9989",
  "--nd-z-toast": "30000",
  "--nd-z-tooltip": "5000",
  "--nd-z-dropdown": "140",
};

test.describe("UI Contradictions Audit", () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(400);
  });

  test("canonical design-system z-index tokens are defined and not collapsed", async ({ page }) => {
    for (const [token, expected] of Object.entries(DS_Z_TOKENS)) {
      const value = await page.evaluate((t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim(), token);
      expect(value, `${token} should be ${expected}`).toBe(expected);
    }
  });

  test("legacy --z-* aliases do not collapse modal/toast layers", async ({ page }) => {
    const aliases = ["--z-modal", "--z-overlay", "--z-toast", "--z-tooltip", "--z-dropdown"];
    const failures: string[] = [];
    for (const alias of aliases) {
      const value = await page.evaluate((t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim(), alias);
      const num = value ? parseInt(value, 10) : null;
      if (num !== null && num < 100) {
        failures.push(`${alias} is ${num}`);
      }
    }
    expect(failures, `legacy z aliases collapsed: ${failures.join(", ")}`).toEqual([]);
  });

  test("settings overlay renders at the canonical modal z-index", async ({ page }) => {
    const app = new AppPage(page);
    await app.openSettings();
    await page.waitForTimeout(300);
    const zIndex = await page.evaluate(() => {
      const el = document.getElementById("settings-overlay");
      return el ? parseInt(getComputedStyle(el).zIndex, 10) : null;
    });
    expect(zIndex, "settings overlay z-index should be >= 9989").toBeGreaterThanOrEqual(9989);
  });

  test("command palette overlay renders at the canonical modal z-index", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    await page.waitForTimeout(300);
    const zIndex = await page.evaluate(() => {
      const el = document.getElementById("command-palette-overlay");
      return el ? parseInt(getComputedStyle(el).zIndex, 10) : null;
    });
    expect(zIndex, "command palette overlay z-index should be >= 9989").toBeGreaterThanOrEqual(9989);
  });

  test("exactly one nav button is marked active", async ({ page }) => {
    const active = await page.locator("button[data-view].active, button[data-view][data-active='true']").count();
    expect(active, "exactly one nav button should be active").toBe(1);
  });

  test("primary chrome controls meet the 40×40px minimum hit target", async ({ page }) => {
    const small = await page.evaluate(() => {
      const selectors = "button[data-view], #settings-btn, #notif-btn, #command-palette-btn";
      return Array.from(document.querySelectorAll(selectors)).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          label: (el as HTMLElement).getAttribute("aria-label") || (el as HTMLElement).textContent?.slice(0, 20) || el.tagName,
          w: rect.width,
          h: rect.height,
        };
      }).filter((s) => s.w < 40 || s.h < 40);
    });
    expect(small, `undersized primary chrome: ${JSON.stringify(small)}`).toEqual([]);
  });

  test("no invalid Tailwind utility classes in the rendered DOM", async ({ page }) => {
    const found = await page.evaluate((patterns) => {
      const out: Array<{ pattern: string; tag: string; class: string }> = [];
      const walk = (el: Element) => {
        const cls = el.className;
        if (typeof cls === "string") {
          for (const p of patterns) {
            if (cls.includes(p)) {
              out.push({ pattern: p, tag: el.tagName, class: cls.slice(0, 120) });
            }
          }
        }
        for (const child of el.children) walk(child);
      };
      walk(document.body);
      return out;
    }, INVALID_CLASS_PATTERNS);
    expect(found, `invalid Tailwind classes found: ${JSON.stringify(found, null, 2)}`).toEqual([]);
  });

  test("command palette traps focus while open", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    // Tab through several elements; focus should never leave the palette card.
    const leaked: string[] = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      const active = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? { id: el.id, tag: el.tagName, ariaLabel: (el as HTMLElement).getAttribute("aria-label") } : null;
      });
      const inPalette = await page.evaluate(() => {
        const overlay = document.getElementById("command-palette-overlay");
        return overlay ? overlay.contains(document.activeElement) : false;
      });
      if (!inPalette) {
        leaked.push(JSON.stringify(active));
      }
    }
    expect(leaked, `focus leaked from command palette: ${leaked.join("; ")}`).toEqual([]);
  });
});
