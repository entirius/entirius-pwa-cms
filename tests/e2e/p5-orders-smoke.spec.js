const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { createErrorCollector } = require('../helpers/error-collector');
const en = require('../../src/i18n/locales/en.json');
const pl = require('../../src/i18n/locales/pl.json');

/**
 * P5 Orders smoke (order e-mail plan 03): the order list opens its first order, which shows the E-mails section.
 * Read-only: never sends, resends or changes an order. A stack without orders stops at the list's empty state.
 */

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  phone: { width: 390, height: 844 },
};

// The admin profile picks the UI language; accept either locale's text.
const { either: escapedEither } = require('./helpers/text');
const either = (pick) => escapedEither(pick(en), pick(pl));

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`P5 Orders (${name})`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('order list opens the first order and its e-mails', async ({ page }) => {
      const collector = createErrorCollector(page);
      await page.goto('/checkout-orders/orders');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.data-table__row, .empty-state').first()).toBeVisible({ timeout: 10000 });
      const firstRow = page.locator('.data-table__row').first();
      if (await firstRow.count()) {
        await firstRow.click();
        await page.waitForURL(/\/checkout-orders\/orders\/[^/]+/);
        await page.waitForLoadState('networkidle');
        const mails = page.getByTestId('order-mails');
        await expect(mails).toBeVisible();
        await expect(mails).toContainText(either((t) => t.checkout_orders.mails.title));
      }

      collector.assertNoErrors(expect, 'Orders');
    });
  });
}
