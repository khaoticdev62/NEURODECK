import { Page, Locator, expect } from "@playwright/test";
import { AppPage } from "./AppPage";

export class SettingsPage extends AppPage {
  readonly modalCard: Locator;
  readonly sidebarGeneral: Locator;
  readonly sidebarAppearance: Locator;
  readonly sidebarTerminal: Locator;
  readonly sidebarNetwork: Locator;
  readonly sidebarPlugins: Locator;
  readonly sidebarSync: Locator;
  readonly sidebarTorrent: Locator;
  readonly sidebarShortcuts: Locator;
  readonly sidebarAccount: Locator;

  constructor(page: Page) {
    super(page);
    this.modalCard = page.locator("#settings-overlay .settings-modal-card");
    this.sidebarGeneral = page.locator(".stv-nav-item[data-panel='sp-general']");
    this.sidebarAppearance = page.locator(".stv-nav-item[data-panel='sp-appearance']");
    this.sidebarTerminal = page.locator(".stv-nav-item[data-panel='sp-terminal']");
    this.sidebarNetwork = page.locator(".stv-nav-item[data-panel='sp-network']");
    this.sidebarPlugins = page.locator(".stv-nav-item[data-panel='sp-plugins']");
    this.sidebarSync = page.locator(".stv-nav-item[data-panel='sp-sync']");
    this.sidebarTorrent = page.locator(".stv-nav-item[data-panel='sp-torrent']");
    this.sidebarShortcuts = page.locator(".stv-nav-item[data-panel='sp-shortcuts']");
    this.sidebarAccount = page.locator(".stv-nav-item[data-panel='sp-account']");
  }

  async openTab(name: "general" | "appearance" | "terminal" | "network" | "plugins" | "sync" | "torrent" | "shortcuts" | "account") {
    const tab = this.page.locator(`.stv-nav-item[data-panel='sp-${name}']`);
    await tab.click();
    await expect(this.page.locator(`#sp-${name}`)).toHaveClass(/active/);
    await expect(this.modalCard).toHaveAttribute("data-settings-theme", name);
  }
}
