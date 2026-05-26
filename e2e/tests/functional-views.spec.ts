import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage";
import { ChatPage } from "../pages/ChatPage";

test.beforeEach(async ({ page }) => {
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();
});

test("terminal view renders xterm container and toolbar", async ({ page }) => {
  const app = new AppPage(page);
  await app.navigateTo("terminal");
  await expect(page.locator(".term-topbar")).toBeVisible();
  await expect(page.locator("#terminal-tabs-list")).toBeVisible();
  await expect(page.locator("#terminal-add-tab-btn")).toBeVisible();
});

test("canvas view renders editor, toolbar, and preview pane", async ({ page }) => {
  const app = new AppPage(page);
  await app.navigateTo("canvas");
  await expect(page.locator("#canvas-lang-select")).toBeVisible();
  await expect(page.locator("#canvas-run-btn")).toBeVisible();
  await expect(page.locator("#canvas-monaco")).toBeVisible();
  await expect(page.locator("#canvas-preview-frame")).toBeVisible();
});

test("ssh view renders connection form", async ({ page }) => {
  const app = new AppPage(page);
  await app.navigateTo("ssh");
  await expect(page.locator("#ssh-host-input")).toBeVisible();
  await expect(page.locator("#ssh-user-input")).toBeVisible();
  await expect(page.locator("#ssh-connect-btn")).toBeVisible();
});

test("browser view renders address bar and home page", async ({ page }) => {
  const app = new AppPage(page);
  await app.navigateTo("browser");
  await expect(page.locator("#browser-url-input")).toBeVisible();
  await expect(page.locator("#browser-go-btn")).toBeVisible();
  await expect(page.locator(".browser-home-kicker")).toBeVisible();
});

test("agent view renders model indicator and action buttons", async ({ page }) => {
  const app = new AppPage(page);
  await app.navigateTo("agent");
  await expect(page.locator("#model-name")).toBeVisible();
  await expect(page.locator("#agent-run-btn")).toBeVisible();
  await expect(page.locator("#agent-task-input")).toBeVisible();
});

test("memory view renders search and upload controls", async ({ page }) => {
  const app = new AppPage(page);
  await app.navigateTo("memory");
  await expect(page.locator(".memory-search-shell")).toBeVisible();
  await expect(page.locator("#memory-fact-save-btn")).toBeVisible();
});

test("chat sends message and shows user bubble", async ({ page }) => {
  const chat = new ChatPage(page);
  await chat.sendMessage("Functional test message");
  await chat.expectUserMessage("Functional test message");
});
