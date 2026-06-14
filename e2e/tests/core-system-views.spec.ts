import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage";

test.describe("Core System Views — Phase 10 Integration", () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.mockTauriBackend();
    await app.goto();
  });

  test("navigates to IDE view and shows explorer + editor shell", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("ide");
    const view = page.getByTestId("view-ide");
    await expect(view.getByRole("heading", { name: "IDE" })).toBeVisible();
    await expect(view.getByText("Explorer", { exact: true })).toBeVisible();
    await expect(view.getByText("Select a file from the explorer to start editing")).toBeVisible();
  });

  test("IDE view can create a new file via prompt", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("ide");
    const view = page.getByTestId("view-ide");
    // Mock prompt to avoid blocking
    await page.evaluate(() => {
      window.prompt = () => "test.txt";
    });
    await view.getByTitle("New file").click();
    // After creation, the file tree should refresh (mock returns empty, so just verify no crash)
    await expect(view.getByRole("heading", { name: "IDE" })).toBeVisible();
  });

  test("navigates to Plugins view and shows empty state", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("plugins");
    const view = page.getByTestId("view-plugins");
    await expect(view.getByRole("heading", { name: "Plugins", exact: true })).toBeVisible();
    await expect(view.getByRole("heading", { name: "No Plugins Match", exact: true })).toBeVisible();
    await expect(view.getByPlaceholder("Install plugin from Git URL or Registry ID...")).toBeVisible();
  });

  test("Plugins view has install button disabled when input is empty", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("plugins");
    const view = page.getByTestId("view-plugins");
    const installBtn = view.getByRole("button", { name: /Install/i });
    await expect(installBtn).toBeDisabled();
  });

  test("navigates to Remote view and shows offline status", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("remote");
    const view = page.getByTestId("view-remote");
    await expect(view.getByRole("heading", { name: "Remote Control" })).toBeVisible();
    await expect(view.getByText("Server Offline")).toBeVisible();
    await expect(view.getByRole("button", { name: /Start remote server/i })).toBeVisible();
  });

  test("navigates to Torrent view and shows empty state", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("torrent");
    const view = page.getByTestId("view-torrent");
    await expect(view.getByRole("heading", { name: "Torrent Client", exact: true })).toBeVisible();
    await expect(view.getByRole("heading", { name: "No torrents", exact: true })).toBeVisible();
  });

  test("Workspace view shows TelemetryWidget on load", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("chat");
    const view = page.getByTestId("view-chat");
    // TelemetryWidget renders 5 stat cards
    await expect(view.getByText("Provider", { exact: true })).toBeVisible();
    await expect(view.getByText("Model", { exact: true })).toBeVisible();
    await expect(view.getByText("RAM", { exact: true })).toBeVisible();
    await expect(view.getByText("Memory", { exact: true })).toBeVisible();
    await expect(view.getByText("Health", { exact: true })).toBeVisible();
  });

  test("Workspace chat input has voice and attach buttons", async ({ page }) => {
    const app = new AppPage(page);
    await app.navigateTo("chat");
    const view = page.getByTestId("view-chat");
    await expect(view.getByLabel("Attach file")).toBeVisible();
    await expect(view.getByLabel("Voice input")).toBeVisible();
    await expect(view.getByLabel("Attach screenshot")).toBeVisible();
  });

  test("Command palette contains Phase 10 view entries", async ({ page }) => {
    const app = new AppPage(page);
    await app.openCommandPalette();
    const overlay = page.locator("#command-palette-overlay");
    await expect(overlay.getByText("Open Workspace")).toBeVisible();
    await expect(overlay.getByText("Open Canvas")).toBeVisible();
    await expect(overlay.getByText("Open Terminal")).toBeVisible();
    await expect(overlay.getByText("Open Remote")).toBeVisible();
    await app.closeCommandPalette();
  });
});
