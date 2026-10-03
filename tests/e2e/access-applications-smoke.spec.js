const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { createErrorCollector } = require('../helpers/error-collector');
const en = require('../../src/i18n/locales/en.json');
const pl = require('../../src/i18n/locales/pl.json');
const { either: escapedEither } = require('./helpers/text');

/**
 * Access plan 22 smoke: the admin opens Access → Applications, finds the seeded legacy checkout application with its
 * legacy marker, opens it and reads the legacy key's source, its last use and "No expiry". Read-only: never creates,
 * rotates or revokes a token (the BDD covers writes).
 */

const either = (pick) => escapedEither(pick(en), pick(pl));
// The seed names it after the module's app label ("Legacy keys: django_checkout").
const LEGACY_CHECKOUT = /^Legacy keys: (django_)?checkout$/;

test.describe('Access applications (desktop)', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('legacy checkout keys show their source, last use and no expiry', async ({ page }) => {
    const collector = createErrorCollector(page);
    await page.goto('/access/applications');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(either((t) => t.access.applications.title));

    const link = page.getByRole('link', { name: LEGACY_CHECKOUT });
    const row = page.locator('[data-testid^="application-row-"]', { has: link });
    await expect(row).toBeVisible();
    await expect(row.locator('.tag', { hasText: either((t) => t.access.tokens.legacy) })).toBeVisible();

    await link.click();
    await page.waitForURL(/\/access\/applications\/\d+$/);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(LEGACY_CHECKOUT);

    const token = page.locator('[data-testid^="token-row-"]', {
      has: page.locator('[data-testid="token-legacy-source"]', { hasText: /^django_checkout\./ }),
    }).first();
    await expect(token).toBeVisible();
    await expect(token.locator('.tag', { hasText: either((t) => t.access.tokens.legacy_key) })).toBeVisible();
    await expect(token.locator('[data-testid="token-expires"]')).toHaveText(either((t) => t.access.tokens.no_expiry));
    await expect(token.locator('[data-testid="token-last-used"]')).not.toBeEmpty();

    collector.assertNoErrors(expect, 'Access applications');
  });
});
