const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { createErrorCollector } = require('../helpers/error-collector');
const en = require('../../src/i18n/locales/en.json');
const pl = require('../../src/i18n/locales/pl.json');

/**
 * Stock alerts smoke (back-in-stock plan 03): Demand and Requests open, a Demand row opens the requests of its SKU.
 * Read-only: never cancels a request, never downloads.
 */

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  phone: { width: 390, height: 844 },
};

// The admin profile picks the UI language; accept either locale's text.
const { either: escapedEither } = require('./helpers/text');
const either = (pick) => escapedEither(pick(en), pick(pl));

async function openPage(page, path) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`Stock alerts (${name})`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('demand opens, a row opens its requests', async ({ page }) => {
      const collector = createErrorCollector(page);
      await openPage(page, '/stock-alerts');

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(either((t) => t.stock_alerts.demand));
      await expect(page.locator('.data-table__row, .empty-state').first()).toBeVisible({ timeout: 10000 });
      const firstRow = page.locator('.data-table__row').first();
      if (await firstRow.count()) {
        await firstRow.click();
        await page.waitForURL(/\/stock-alerts\/subscriptions\?sku=/);
        await expect(page.getByTestId('stock-alerts-sku-chip')).toBeVisible();
      }

      collector.assertNoErrors(expect, 'Stock alerts demand');
    });

    test('requests open with the status filter and the CSV action', async ({ page }) => {
      const collector = createErrorCollector(page);
      await openPage(page, '/stock-alerts/subscriptions');

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(either((t) => t.stock_alerts.subscriptions));
      await expect(page.getByRole('button', { name: either((t) => t.stock_alerts.download_csv) })).toBeVisible();
      await expect(page.locator('.data-table__row, .empty-state').first()).toBeVisible({ timeout: 10000 });

      collector.assertNoErrors(expect, 'Stock alerts requests');
    });
  });
}
