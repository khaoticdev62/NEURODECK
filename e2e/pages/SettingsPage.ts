import { Page, Locator, expect } from "@playwright/test";
import { AppPage } from "./AppPage";

export class SettingsPage extends AppPage {
  readonly modalCard: Locator;
  readonly sidebarGeneral: Locator;
  readonly sidebarAi: Locator;
  readonly sidebarAppearance: Locator;
  readonly sidebarTerminal: Locator;
  readonly sidebarExtensions: Locator;
  readonly sidebarMemory: Locator;
  readonly sidebarNetwork: Locator;
  readonly sidebarComputer: Locator;
  readonly sidebarSync: Locator;
  readonly sidebarVoice: Locator;

  constructor(page: Page) {
    super(page);
    this.modalCard = page.locator("#settings-overlay .settings-modal-card");
    this.sidebarGeneral = page.locator(".stv-nav-item[data-panel='sp-general']");
    this.sidebarAi = page.locator(".stv-nav-item[data-panel='sp-ai']");
    this.sidebarAppearance = page.locator(".stv-nav-item[data-panel='sp-appearance']");
    this.sidebarTerminal = page.locator(".stv-nav-item[data-panel='sp-terminal']");
    this.sidebarExtensions = page.locator(".stv-nav-item[data-panel='sp-extensions']");
    this.sidebarMemory = page.locator(".stv-nav-item[data-panel='sp-memory']");
    this.sidebarNetwork = page.locator(".stv-nav-item[data-panel='sp-network']");
    this.sidebarComputer = page.locator(".stv-nav-item[data-panel='sp-computer']");
    this.sidebarSync = page.locator(".stv-nav-item[data-panel='sp-sync']");
    this.sidebarVoice = page.locator(".stv-nav-item[data-panel='sp-voice']");
  }

  async openTab(name: "general" | "ai" | "appearance" | "terminal" | "extensions" | "memory" | "network" | "computer" | "sync" | "voice") {
    const tab = this.page.locator(`.stv-nav-item[data-panel='sp-${name}']`);
    await tab.click();
    await expect(this.page.locator(`#sp-${name}`)).toHaveClass(/active/);
    await expect(this.modalCard).toHaveAttribute("data-settings-theme", name);
  }
}
