const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to all console messages
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}]`, msg.text());
  });

  // Listen to page errors
  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error.message);
    console.log(error.stack);
  });

  // Navigate to app
  console.log('Opening http://localhost:8080...');
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });

  console.log('\n=== Waiting 10 seconds for any errors ===\n');
  await page.waitForTimeout(10000);

  await browser.close();
})();
