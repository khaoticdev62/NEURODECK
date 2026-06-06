import { test, expect } from '../support/electron-fixture';

test.describe('Electron Native', () => {
  test('launches electron and renders the boot sequence', async ({ page }) => {
    // Wait for the NEURODECK UI to load. The boot overlay takes a moment to disappear.
    await expect(page.locator('#app')).toBeVisible({ timeout: 15000 });
    
    // Verify the title is correct
    expect(await page.title()).toBe('neurodeck');
  });
  
  test('verifies custom file protocol is used', async ({ page }) => {
    const url = page.url();
    // Since we did not pass ELECTRON_DEV=1, it should use the neurodeck:// custom scheme.
    expect(url).toContain('neurodeck://app/index.html');
  });

  test('verifies torrent inner tab is accessible in the share view', async ({ page }) => {
    await expect(page.locator('#app')).toBeVisible({ timeout: 15000 });
    await page.click('button[data-view="share"]');
    await page.click('button.share-inner-tab[data-panel="torrent"]');
    await expect(page.locator('#share-panel-torrent')).toBeVisible();
    await expect(page.locator('#torrent-source-input')).toBeVisible();
  });
});
