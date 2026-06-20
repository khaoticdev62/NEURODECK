import { Page, Locator, expect, type TestInfo } from "@playwright/test";
import { buildTauriMock } from "../support/tauri-mock";


export class AppPage {
  readonly page: Page;

  // Navigation
  readonly navTabChat: Locator;
  readonly navTabCanvas: Locator;
  readonly navTabTerminal: Locator;
  readonly navTabSsh: Locator;
  readonly navTabTunnel: Locator;
  readonly navTabShare: Locator;
  readonly navTabBrowser: Locator;
  readonly navTabAgent: Locator;
  readonly navTabMemory: Locator;
  readonly navTabPromptLab: Locator;
  readonly navTabRemote: Locator;
  readonly navTabDocs: Locator;
  readonly navTabIde: Locator;
  readonly navTabPlugins: Locator;
  readonly navTabTorrent: Locator;

  // Navigation — Security & Ops
  readonly navTabSecurity: Locator;
  readonly navTabThemes: Locator;
  readonly navTabExports: Locator;
  readonly navTabMaintenance: Locator;
  readonly navTabRecovery: Locator;

  // Views
  readonly viewChat: Locator;
  readonly viewCanvas: Locator;
  readonly viewTerminal: Locator;
  readonly viewSsh: Locator;
  readonly viewTunnel: Locator;
  readonly viewShare: Locator;
  readonly viewBrowser: Locator;
  readonly viewAgent: Locator;
  readonly viewMemory: Locator;
  readonly viewPromptLab: Locator;
  readonly viewRemote: Locator;
  readonly viewDocs: Locator;
  readonly viewIde: Locator;
  readonly viewPlugins: Locator;
  readonly viewTorrent: Locator;

  // Views — Security & Ops
  readonly viewSecurity: Locator;
  readonly viewThemes: Locator;
  readonly viewExports: Locator;
  readonly viewMaintenance: Locator;
  readonly viewRecovery: Locator;

  // Global chrome
  readonly settingsBtn: Locator;
  readonly settingsOverlay: Locator;
  readonly commandPaletteBtn: Locator;
  readonly commandPaletteOverlay: Locator;
  readonly notifBtn: Locator;
  readonly notifModal: Locator;
  readonly shortcutsOverlay: Locator;
  readonly quickSwitcherOverlay: Locator;
  readonly deckModeToggle: Locator;
  readonly controllerHintBar: Locator;

  constructor(page: Page) {
    this.page = page;

    this.navTabChat = page.getByTestId("nav-tab-chat");
    this.navTabCanvas = page.getByTestId("nav-tab-canvas");
    this.navTabTerminal = page.getByTestId("nav-tab-terminal");
    this.navTabSsh = page.getByTestId("nav-tab-ssh");
    this.navTabTunnel = page.getByTestId("nav-tab-tunnel");
    this.navTabShare = page.getByTestId("nav-tab-share");
    this.navTabBrowser = page.getByTestId("nav-tab-browser");
    this.navTabAgent = page.getByTestId("nav-tab-agent");
    this.navTabMemory = page.getByTestId("nav-tab-memory");
    this.navTabPromptLab = page.getByTestId("nav-tab-prompt-lab");
    this.navTabRemote = page.getByTestId("nav-tab-remote");
    this.navTabDocs = page.getByTestId("nav-tab-docs");
    this.navTabIde = page.getByTestId("nav-tab-ide");
    this.navTabPlugins = page.getByTestId("nav-tab-plugins");
    this.navTabTorrent = page.getByTestId("nav-tab-torrent");

    this.navTabSecurity    = page.getByTestId("nav-tab-security");
    this.navTabThemes      = page.getByTestId("nav-tab-themes");
    this.navTabExports     = page.getByTestId("nav-tab-exports");
    this.navTabMaintenance = page.getByTestId("nav-tab-maintenance");
    this.navTabRecovery    = page.getByTestId("nav-tab-recovery");

    this.viewChat = page.getByTestId("view-chat");
    this.viewCanvas = page.getByTestId("view-canvas");
    this.viewTerminal = page.getByTestId("view-terminal");
    this.viewSsh = page.getByTestId("view-ssh");
    this.viewTunnel = page.getByTestId("view-tunnel");
    this.viewShare = page.getByTestId("view-share");
    this.viewBrowser = page.getByTestId("view-browser");
    this.viewAgent = page.getByTestId("view-agent");
    this.viewMemory = page.getByTestId("view-memory");
    this.viewPromptLab = page.getByTestId("view-prompt-lab");
    this.viewRemote = page.getByTestId("view-remote");
    this.viewDocs = page.getByTestId("view-docs");
    this.viewIde = page.getByTestId("view-ide");
    this.viewPlugins = page.getByTestId("view-plugins");
    this.viewTorrent = page.getByTestId("view-torrent");

    this.viewSecurity    = page.getByTestId("view-security");
    this.viewThemes      = page.getByTestId("view-themes");
    this.viewExports     = page.getByTestId("view-exports");
    this.viewMaintenance = page.getByTestId("view-maintenance");
    this.viewRecovery    = page.getByTestId("view-recovery");

    this.settingsBtn = page.locator("#settings-btn");
    this.settingsOverlay = page.locator("#settings-overlay");
    this.commandPaletteBtn = page.locator("#command-palette-btn");
    this.commandPaletteOverlay = page.locator("#command-palette-overlay");
    this.notifBtn = page.locator("#notif-btn");
    this.notifModal = page.locator("#notif-modal");
    this.shortcutsOverlay = page.locator("#shortcuts-overlay");
    this.quickSwitcherOverlay = page.locator("#quick-switcher-overlay");
    this.deckModeToggle = page.getByTestId("deck-mode-toggle");
    this.controllerHintBar = page.locator('[aria-label="Controller hints"]');
  }

  async goto() {
    await this.page.goto("/");
    await this.page.locator("#boot-overlay")
      .waitFor({ state: "detached", timeout: 12000 })
      .catch(async () => {
        // Boot overlay didn't self-remove within 12s — force-remove it so tests can proceed.
        // This can happen in slow CI environments or when the mock returns slowly.
        await this.page.evaluate(() => document.getElementById("boot-overlay")?.remove());
      });
  }

  async navigateTo(view: string) {
    const tab = this.page.locator(`button[data-view="${view}"]`).first();
    const count = await tab.count();
    if (count > 0) {
      // React still receives programmatic clicks for responsive navigation
      // controls that remain mounted but are visually hidden at narrow widths.
      // This is more deterministic than routing through the command palette.
      await tab.evaluate((el) => (el as HTMLButtonElement).click());
    } else {
      // Narrow/mobile viewports only expose primary tabs; fall back to the
      // command palette for the rest of the views.
      await this.openCommandPalette();
      const input = this.page.locator('#command-palette-input');
      const label = view.charAt(0).toUpperCase() + view.slice(1);
      await input.fill(`Open ${label}`);
      const item = this.page.locator('.command-palette-item').filter({ hasText: new RegExp(`Open ${label}`, 'i') }).first();
      await item.click();
      await this.closeCommandPalette();
    }
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await expect(this.page.getByTestId(`view-${view}`)).toHaveClass(/active/);
  }

  async openSettings() {
    // Use evaluate click — sidebar button may be hidden at narrow viewports
    // but el.click() still dispatches via React's event delegation.
    await this.settingsBtn.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(this.settingsOverlay).toHaveClass(/active/);
  }

  async closeSettings() {
    await this.page.keyboard.press("Escape");
    await expect(this.settingsOverlay).not.toHaveClass(/active/);
  }

  async openCommandPalette() {
    // Ensure the app finished basic rendering and the button is present.
    await this.page.waitForSelector('#main-content', { state: 'visible', timeout: 15000 }).catch(() => {});
    await this.page.waitForSelector('#command-palette-btn', { state: 'visible', timeout: 15000 }).catch(() => {});
    // Use evaluate click so it works even when the sidebar is hidden on narrow
    // viewports (the button is still in the DOM).
    await this.commandPaletteBtn.evaluate((el) => (el as HTMLButtonElement).click());
    // Allow short stabilization for overlays/animations before asserting.
    await this.page.waitForTimeout(120);
    await expect(this.commandPaletteOverlay).toHaveClass(/active/);
  }

  async closeCommandPalette() {
    await this.page.keyboard.press("Escape");
    await expect(this.commandPaletteOverlay).not.toHaveClass(/active/);
  }

  async openShortcuts() {
    await this.page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.());
    await this.page.keyboard.press("?");
    await expect(this.shortcutsOverlay).not.toHaveClass(/hidden/);
  }

  async openNotifications() {
    await this.notifBtn.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(this.notifModal).toHaveClass(/active/);
  }

  async openQuickSwitcher() {
    // Try opening the quick switcher directly first. It only appears when the
    // app has already visited more than one view.
    await this.page.keyboard.press("Control+Tab");
    await this.page.waitForTimeout(150);
    const isOpen = await this.quickSwitcherOverlay
      .evaluate((el) => el.classList.contains("active"))
      .catch(() => false);

    if (!isOpen) {
      // No history yet — seed it by visiting an anchor view and returning.
      const currentView = await this.page.evaluate(() => {
        const el = document.querySelector("[data-testid^='view-'].active");
        return el?.getAttribute("data-testid")?.replace("view-", "") ?? "chat";
      });
      const pivot = currentView === "memory" ? "chat" : "memory";
      await this.navigateTo(pivot);
      await this.navigateTo(currentView as Parameters<typeof this.navigateTo>[0]);
      await this.page.keyboard.press("Control+Tab");
    }

    await expect(this.quickSwitcherOverlay).toHaveClass(/active/);
  }

  async closeQuickSwitcher() {
    await this.page.keyboard.press("Escape");
    await expect(this.quickSwitcherOverlay).not.toHaveClass(/active/);
  }

  async setDeckMode(enabled: boolean) {
    const isOn = await this.deckModeToggle.evaluate(
      (el) => el.getAttribute("aria-label") === "Deck Mode On"
    );
    if (isOn !== enabled) {
      await this.deckModeToggle.evaluate((el) => (el as HTMLButtonElement).click());
      await expect(this.controllerHintBar).toBeVisible({ visible: enabled });
    }
  }

  async mockTauriBackend() {
    await this.page.addInitScript(buildTauriMock);
  }

  async mockBridgeBackend() {
    await this.mockTauriBackend();
  }

  async stabilizeForScreenshot() {
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      localStorage.setItem("neurodeck:e2e-clock", "2026-06-19T12:00:00.000Z");
    });
    await this.page.addStyleTag({ content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
      .live-timer,
      .timestamp,
      .timeago,
      .last-updated,
      .last-seen,
      .terminal-cursor,
      .monaco-editor .cursors {
        visibility: hidden !important;
      }
    ` });
    await this.page.waitForTimeout(100);
  }

  // ── Audit helpers ─────────────────────────────────────────────────────────

  async assertNoHorizontalOverflow() {
    const overflow = await this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow, "horizontal overflow detected").toBe(false);
  }

  assertNoConsoleErrors(errors: string[]) {
    const real = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("sidecar") &&
        !e.includes("127.0.0.1:9477") &&
        !e.includes("websocket") &&
        !e.toLowerCase().includes("net::err_connection_refused")
    );
    expect(real, `console errors: ${real.join("; ")}`).toEqual([]);
  }

  async assertViewVisible(viewId: string) {
    await expect(this.page.getByTestId(`view-${viewId}`)).toHaveClass(/active/);
  }

  async captureScreen(name: string) {
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.page.screenshot({
      path: `test-results/ui-audit/${name}.png`,
      fullPage: true,
    });
  }

  async assertNoTauriText() {
    const body = await this.page.locator("body").textContent();
    const hasTauri = /\btauri\b/i.test(body ?? "");
    expect(hasTauri, 'page should not contain the word "tauri"').toBe(false);
  }

  async assertNoPlaceholderText() {
    const page = this.page;
    const badPhrases = [
      page.getByText(/lorem ipsum/i),
      page.getByText(/coming soon/i),
      page.getByText(/placeholder/i),
      page.getByText(/dummy data/i),
      page.getByText(/mock data/i),
    ];
    for (const loc of badPhrases) {
      expect(await loc.count(), `placeholder text found on page`).toBe(0);
    }
  }

  async checkTouchTargets(): Promise<Array<{ text: string; h: number; w: number }>> {
    return this.page
      .locator("button, [role='button'], a[href], input, select, textarea")
      .evaluateAll((els) =>
        els
          .map((el) => {
            const r = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return {
              text: (el as HTMLElement).textContent?.trim().slice(0, 40) ?? "",
              h: Math.round(r.height),
              w: Math.round(r.width),
              offscreen: r.left < -100 || r.top < -100 || style.position === "absolute" && r.height <= 1,
            };
          })
          .filter((t) => t.h > 0 && t.h < 36 && !t.offscreen)
          .map(({ text, h, w }) => ({ text, h, w }))
      );
  }
}
