(async () => {
  const { chromium } = require('playwright');
  const url = process.env.DEV_URL || 'http://127.0.0.1:1420';
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    const resp = await page.goto(url, { timeout: 15000 });
    if (!resp || resp.status() >= 400) {
      console.error('Failed to load URL', url, resp && resp.status());
      await browser.close();
      process.exit(2);
    }
    // Quick check for main app element or meaningful title
    const title = await page.title();
    const hasAppRoot = await page.$('[data-app-root], #root, body') !== null;
    console.log('Loaded', url, 'status=', resp.status(), 'title=', title);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Smoke check error:', err);
    try { await browser.close(); } catch (_) {}
    process.exit(1);
  }
})();
