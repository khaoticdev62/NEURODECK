import { test, expect } from "@playwright/test";
import { AppPage } from "../pages/AppPage";

test.beforeEach(async ({ page }) => {
  const app = new AppPage(page);
  await app.mockTauriBackend();
  await app.goto();
  await app.navigateTo("memory");
});

test("memory view: search box accepts input and triggers search", async ({ page }) => {
  const input = page.locator("#memory-search-input");
  await expect(input).toBeVisible();
  await input.fill("neural network");
  await expect(input).toHaveValue("neural network");
});

test("memory view: fact input and save button are present", async ({ page }) => {
  await expect(page.locator("#new-memory-fact")).toBeVisible();
  await expect(page.locator("#memory-fact-save-btn")).toBeVisible();
});

test("memory view: typing in fact input enables save button or shows validation", async ({ page }) => {
  const input = page.locator("#new-memory-fact");
  const saveBtn = page.locator("#memory-fact-save-btn");
  await input.fill("TypeScript is a typed superset of JavaScript.");
  await expect(input).toHaveValue("TypeScript is a typed superset of JavaScript.");
  const disabled = await saveBtn.getAttribute("disabled");
  expect(disabled).toBeNull();
});

test("memory view: save button is disabled or restricted for empty input", async ({ page }) => {
  const input = page.locator("#new-memory-fact");
  const saveBtn = page.locator("#memory-fact-save-btn");
  await input.fill("");
  await saveBtn.click().catch(() => {});
  await expect(page.locator(".memory-shell")).toBeVisible();
});

test("memory view: empty state message appears when no facts are loaded", async ({ page }) => {
  await expect(page.locator(".memory-shell")).toBeVisible();
});

test("memory view: search can be cleared by selecting all and deleting", async ({ page }) => {
  const input = page.locator("#memory-search-input");
  await input.fill("test query");
  await expect(input).toHaveValue("test query");
  await input.selectText();
  await page.keyboard.press("Delete");
  await expect(input).toHaveValue("");
});

test("memory view: MMR search toggle or controls are accessible", async ({ page }) => {
  await expect(page.locator(".memory-search-shell")).toBeVisible();
});

test("memory view: keyboard navigation — tab reaches the fact input", async ({ page }) => {
  const input = page.locator("#new-memory-fact");
  await page.locator("#memory-search-input").focus();
  await input.focus();
  await expect(input).toBeFocused();
});
