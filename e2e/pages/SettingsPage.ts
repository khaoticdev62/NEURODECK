import { Page, Locator, expect } from "@playwright/test";
import { AppPage } from "./AppPage";

export class SettingsPage extends AppPage {
  readonly modalCard: Locator;
  readonly sidebarGeneral: Locator;
  readonly sidebarAi: Locator;
  readonly sidebarAppearance: Locator;
  readonly sidebarInput: Locator;
  readonly sidebarPerformance: Locator;
  readonly sidebarExtensions: Locator;
  readonly sidebarPrivacy: Locator;

  constructor(page: Page) {
    super(page);
    this.modalCard = page.locator("#settings-overlay .settings-modal-card");
    this.sidebarGeneral = page.getByTestId("settings-tab-general");
    this.sidebarAi = page.getByTestId("settings-tab-ai");
    this.sidebarAppearance = page.getByTestId("settings-tab-appearance");
    this.sidebarInput = page.getByTestId("settings-tab-input");
    this.sidebarPerformance = page.getByTestId("settings-tab-performance");
    this.sidebarExtensions = page.getByTestId("settings-tab-extensions");
    this.sidebarPrivacy = page.getByTestId("settings-tab-privacy");
  }

  async openTab(name: "general" | "ai" | "appearance" | "input" | "performance" | "extensions" | "privacy") {
    const tab = this.page.getByTestId(`settings-tab-${name}`);
    await tab.click();
    await expect(this.page.locator(`#sp-${name}`)).toHaveClass(/active/);
    await expect(this.modalCard).toHaveAttribute("data-settings-theme", name);
  }
}
