const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { createErrorCollector } = require('../helpers/error-collector');
const en = require('../../src/i18n/locales/en.json');
const pl = require('../../src/i18n/locales/pl.json');
const { either: escapedEither } = require('./helpers/text');

/**
 * Access plan 21 smoke: the admin opens Access → Staff, finds the seeded `viewer` and sees the Viewer role, opens the
 * account, then filters the Audit by "grant.migrate". Read-only: never grants or revokes (the BDD covers writes).
 */

const either = (pick) => escapedEither(pick(en), pick(pl));

test.describe('Access staff and audit (desktop)', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('staff list finds viewer with the Viewer role; audit filters by action', async ({ page }) => {
    const collector = createErrorCollector(page);
    await page.goto('/access/staff');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(either((t) => t.access.staff.title));

    const staffSearch = page.waitForResponse((r) => r.url().includes('/admin/staff/') && r.url().includes('search=viewer'));
    await page.locator('[data-testid="staff-search"] input').fill('viewer');
    await staffSearch;
    const row = page.locator('[data-testid="staff-row-viewer"]');
    await expect(row).toBeVisible();
    await expect(row.locator('.tag', { hasText: /^Viewer$/ })).toBeVisible();

    await row.locator('a').click();
    await page.waitForURL(/\/access\/staff\/\d+$/);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="grant-row-viewer"]')).toBeVisible();
    await expect(page.locator('[data-testid="grant-role-select"]')).toBeVisible();

    // In-app navigation: a full reload here would abort the detail page's lazily loaded chunks.
    await page.getByRole('link', { name: either((t) => t.nav.access.audit) }).click();
    await page.waitForURL(/\/access\/audit$/);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(either((t) => t.access.audit.title));
    const filtered = page.waitForResponse((r) => r.url().includes('/admin/audit/') && r.url().includes('action=grant.migrate'));
    await page.getByRole('combobox', { name: either((t) => t.access.audit.action) }).click();
    await page.getByRole('option', { name: either((t) => t.access.audit.actions.grant.migrate) }).click();
    expect((await filtered).status()).toBe(200);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid^="audit-row-"]:not([data-testid="audit-row-grant.migrate"])')).toHaveCount(0);

    collector.assertNoErrors(expect, 'Access staff and audit');
  });
});
