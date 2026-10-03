const { test } = require('@playwright/test');
const { login } = require('../helpers/auth');
test('probe', async ({ page }) => {
  await login(page, 'viewer', 'viewer123');
  await page.goto('/faq/groups/shipping'); await page.waitForLoadState('networkidle');
  const els = page.locator('main input:visible, main textarea:visible, main button:visible, main [role=combobox]:visible, main [role=switch]');
  for (const e of await els.all()) console.log(await e.evaluate((n) => n.outerHTML.slice(0, 220)));
  const sb = page.locator('[data-testid="app-sidebar"]');
  console.log((await sb.innerText()).replace(/\n/g, ' | '));
});
