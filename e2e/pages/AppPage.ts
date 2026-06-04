import { Page, Locator, expect } from "@playwright/test";
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

  // Global chrome
  readonly settingsBtn: Locator;
  readonly settingsOverlay: Locator;
  readonly commandPaletteBtn: Locator;
  readonly commandPaletteOverlay: Locator;
  readonly notifBtn: Locator;
  readonly notifModal: Locator;
  readonly shortcutsOverlay: Locator;
  readonly quickSwitcherOverlay: Locator;

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

    this.settingsBtn = page.locator("#settings-btn");
    this.settingsOverlay = page.locator("#settings-overlay");
    this.commandPaletteBtn = page.locator("#command-palette-btn");
    this.commandPaletteOverlay = page.locator("#command-palette-overlay");
    this.notifBtn = page.locator("#notif-btn");
    this.notifModal = page.locator("#notif-modal");
    this.shortcutsOverlay = page.locator("#shortcuts-overlay");
    this.quickSwitcherOverlay = page.locator("#quick-switcher-overlay");
  }

  async goto() {
    await this.page.goto("/");
    await this.page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});
  }

  async navigateTo(view: string) {
    const tab = this.page.getByTestId(`nav-tab-${view}`);
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await expect(this.page.getByTestId(`view-${view}`)).toHaveClass(/active/);
  }

  async openSettings() {
    await this.settingsBtn.click();
    await expect(this.settingsOverlay).toHaveClass(/active/);
  }

  async closeSettings() {
    await this.page.keyboard.press("Escape");
    await expect(this.settingsOverlay).not.toHaveClass(/active/);
  }

  async openCommandPalette() {
    await this.page.keyboard.press("Control+K");
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

  async openQuickSwitcher() {
    await this.page.keyboard.press("Control+Tab");
    await expect(this.quickSwitcherOverlay).toHaveClass(/active/);
  }

  async closeQuickSwitcher() {
    await this.page.keyboard.press("Escape");
    await expect(this.quickSwitcherOverlay).not.toHaveClass(/active/);
  }

  async mockTauriBackend() {
    await this.page.addInitScript(buildTauriMock);
  }
}
