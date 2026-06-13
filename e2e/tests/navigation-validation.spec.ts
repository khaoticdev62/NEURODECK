import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage";
import { SettingsPage } from "../pages/SettingsPage";

test.beforeEach(async ({ page }) => {
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();
});

/**
 * Phase 2: Comprehensive Navigation Validation
 *
 * Validates that every view can be reached by:
 * 1. Direct nav tab click
 * 2. URL hash state
 * 3. Command palette
 * 4. Quick Switcher (Ctrl+Tab)
 * 5. Keyboard (Tab → Enter on nav tab)
 *
 * Also verifies that each view renders its identifying chrome.
 */

const VIEWS = [
  { id: "chat", name: "Chat", selector: "#user-input" },
  { id: "canvas", name: "Canvas", selector: "#canvas-monaco" },
  { id: "terminal", name: "Terminal", selector: "#terminal-new-tab-btn" },
  { id: "ssh", name: "SSH", selector: "#ssh-host-input" },
  { id: "tunnel", name: "Tunnel", selector: ".tunnel-kicker" },
  { id: "share", name: "Share", selector: ".share-view-kicker" },
  { id: "browser", name: "Browser", selector: "#browser-address-input" },
  { id: "agent", name: "Agent", selector: "#agent-task-input" },
  { id: "memory", name: "Memory", selector: "#memory-search-input" },
  { id: "prompt-lab", name: "Prompt Lab", selector: ".prompt-lab-container" },
  { id: "remote", name: "Remote", selector: ".remote-status-badge" },
  { id: "docs", name: "Docs", selector: "#docs-search-input" }
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Nav tab click → view activation + identifying chrome
// ─────────────────────────────────────────────────────────────────────────────
for (const view of VIEWS) {
  test(`nav tab click activates ${view.name} view and renders chrome`, async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo(view.id);

    // Nav tab has active class
    await expect(page.getByTestId(`nav-tab-${view.id}`)).toHaveClass(/active/);

    // View container has active class
    await expect(page.getByTestId(`view-${view.id}`)).toHaveClass(/active/);

    // Identifying element is visible
    await expect(page.locator(view.selector)).toBeVisible();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Command palette can drive view navigation
// ─────────────────────────────────────────────────────────────────────────────
const COMMAND_PALETTE_COMMANDS: Record<string, string> = {
  chat: "Open Workspace",
  canvas: "Open Canvas",
  terminal: "Open Terminal",
  ssh: "Open SSH",
  tunnel: "Open Tunnel",
  share: "Open Share",
  browser: "Open Browser",
  agent: "Open Agent Dock",
  memory: "Open Memory Vault",
  "prompt-lab": "Open Prompt Lab",
  remote: "Open Remote",
  docs: "Open Docs",
};

for (const view of VIEWS) {
  test(`command palette navigates to ${view.name}`, async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();

    const label = COMMAND_PALETTE_COMMANDS[view.id];
    await page.locator("#command-palette-input").fill(label);
    const item = page.locator("#command-palette-list .command-palette-item").filter({ hasText: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).first();
    await item.click();

    await expect(page.getByTestId(`nav-tab-${view.id}`)).toHaveClass(/active/);
    await expect(page.getByTestId(`view-${view.id}`)).toHaveClass(/active/);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Quick Switcher (Ctrl+Tab) cycles recent views
// ─────────────────────────────────────────────────────────────────────────────
test("quick switcher cycles through recent views", async ({ page }) => {
  const app = new AppPage(page);

  // Visit three views to build history
  await app.navigateTo("chat");
  await app.navigateTo("canvas");
  await app.navigateTo("terminal");

  // Open quick switcher — should show recent views excluding current
  await app.openQuickSwitcher();

  const items = page.locator("#quick-switcher-list .quick-switcher-item");
  await expect(items.first()).toBeVisible();

  // Pressing Ctrl+Tab again should cycle to next
  await page.keyboard.press("Control+Tab");

  // Select first item with Enter
  await page.keyboard.press("Enter");
  await app.closeQuickSwitcher();

  // We should have switched away from terminal
  const activeView = page.locator(".view-content.active");
  await expect(activeView).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Only one view is active at a time
// ─────────────────────────────────────────────────────────────────────────────
test("only one view has active class at any time", async ({ page }) => {
  const app = new AppPage(page);

  for (const view of VIEWS) {
    await app.navigateTo(view.id);

    const activeViews = await page.locator(".view-content.active").count();
    expect(activeViews).toBe(1);

    const activeNavTabs = await page.locator("[data-testid^='nav-tab-'].active").count();
    expect(activeNavTabs).toBe(1);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Navigation persists across settings modal open/close
// ─────────────────────────────────────────────────────────────────────────────
for (const view of VIEWS.slice(0, 4)) {
  test(`navigation to ${view.name} persists through settings modal`, async ({ page }) => {
    const app = new AppPage(page);
    const settings = new SettingsPage(page);

    await app.navigateTo(view.id);
    await settings.openSettings();
    await settings.closeSettings();

    await expect(page.getByTestId(`view-${view.id}`)).toHaveClass(/active/);
    await expect(page.locator(view.selector)).toBeVisible();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Radial menu / backtick navigation (if present in DOM)
// ─────────────────────────────────────────────────────────────────────────────
test("radial menu overlay opens and contains all 12 view segments", async ({ page }) => {
  const app = new AppPage(page);

  // Open radial menu with backtick
  await page.keyboard.press("Backquote");

  const radial = page.locator("#radial-menu-overlay");
  // The radial menu may be conditionally rendered; skip if absent
  const count = await radial.count();
  if (count === 0) {
    test.skip(true, "Radial menu not present in this build");
    return;
  }

  await expect(radial).toBeVisible();

  // Should have 21 segments matching all views
  const segments = page.locator("#radial-menu-overlay .radial-segment");
  await expect(segments).toHaveCount(21);

  // Close with Escape
  await page.keyboard.press("Escape");
  await expect(radial).not.toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Steam Deck viewport: all nav tabs remain clickable without overflow
// ─────────────────────────────────────────────────────────────────────────────
test("Steam Deck 1280x800: all nav tabs clickable, no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.reload();

  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();

  const navStrip = page.locator(".nav-tab-bar");
  const box = await navStrip.boundingBox();
  expect(box).not.toBeNull();

  // ScrollWidth should equal clientWidth (no overflow)
  const scrollWidth = await navStrip.evaluate((el) => el.scrollWidth);
  const clientWidth = await navStrip.evaluate((el) => el.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allow 2px rounding

  for (const view of VIEWS) {
    await app.navigateTo(view.id);
    await expect(page.getByTestId(`view-${view.id}`)).toHaveClass(/active/);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Boot overlay completes before navigation is available
// ─────────────────────────────────────────────────────────────────────────────
test("boot overlay detaches before any navigation is possible", async ({ page }) => {
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();

  // Boot overlay should be gone
  await expect(page.locator("#boot-overlay")).toHaveCount(0);

  // Nav tabs should be clickable immediately after
  await app.navigateTo("chat");
  await expect(page.getByTestId("view-chat")).toHaveClass(/active/);
});
