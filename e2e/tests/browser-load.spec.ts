import { test, expect } from '../support/electron-fixture';

test('creates a tab and navigates to google when clicking Go with no existing tabs', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Native WebContentsView overlay is verified on desktop viewport');

  // Wait for the app shell and switch to the browser view
  const browserTab = page.locator('.nav-tab[data-view="browser"]');
  await expect(browserTab).toBeVisible({ timeout: 20000 });

  // Dismiss the onboarding modal if it appears
  const getStarted = page.getByRole('button', { name: 'Get Started' });
  if (await getStarted.isVisible().catch(() => false)) {
    await getStarted.click();
    await page.waitForTimeout(300);
  }

  await browserTab.click();

  // Wait for the React browser UI
  const input = page.getByPlaceholder('Search or enter web URL...');
  await expect(input).toBeVisible({ timeout: 10000 });

  // Type a URL and click Go with no existing tabs
  await input.fill('www.google.com');
  await page.getByRole('button', { name: 'Go' }).click();

  // Give the native WebContentsView time to load
  await page.waitForTimeout(5000);

  // Verify the tab actually loaded
  const tabs = await page.evaluate(async () => {
    const api = (window as any).neurodeck?.browser;
    if (!api) return null;
    return api.getTabs();
  });

  expect(tabs).toBeInstanceOf(Array);
  expect(tabs.length).toBeGreaterThan(0);
  expect(tabs[0].url).toContain('google.com');
  expect(tabs[0].state).toMatch(/loading|ready/);
});
