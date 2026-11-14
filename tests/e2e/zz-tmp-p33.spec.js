const { test } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { SUPERUSER } = require('./helpers/users');
test.use({ viewport: { width: 1280, height: 900 } });
test('look', async ({ page }) => {
  await login(page, ...SUPERUSER);
  for (const id of (process.env.IDS || '168').split(',')) {
    await page.goto(`/leads/companies/${id}?tab=timeline`);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `/tmp/p33/card-${id}.png`, fullPage: true });
    console.log(id, await page.locator('[data-testid=earlier-toggle]').count());
  }
});
