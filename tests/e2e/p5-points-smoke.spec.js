const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { createErrorCollector } = require('../helpers/error-collector');
const en = require('../../src/i18n/locales/en.json');
const pl = require('../../src/i18n/locales/pl.json');

/**
 * P5 Points smoke (plan 43): the point list and its first point, the create form, the type list with the edit dialog
 * of its first custom type opened and cancelled. Read-only: never saves, confirms or deletes.
 */

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  phone: { width: 390, height: 844 },
};

// The dev server's hot-reload socket (the zeno CMS container answers on another port) is not a page error.
const DEV_SERVER = ['WebSocket connection to'];

// The admin profile picks the UI language; accept either locale's text.
const { either: escapedEither } = require('./helpers/text');
const either = (pick) => escapedEither(pick(en), pick(pl));
const h1 = (page) => page.getByRole('heading', { level: 1 });

async function openPage(page, path) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

async function listRows(page) {
  const rows = page.locator('.page-layout .data-table__row');
  await expect(rows.first().or(page.locator('.empty-state').first())).toBeVisible({ timeout: 10000 });
  return rows;
}

async function expectForm(page) {
  await expect(h1(page)).not.toBeEmpty();
  await expect(page.getByRole('button', { name: either((t) => t.common.save) })).toBeVisible();
  await expect(page.locator('.basic-card .form-grid').first()).toBeVisible();
}

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`P5 Points (${name})`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('point list: inline filters, the first point opens', async ({ page }) => {
      const collector = createErrorCollector(page, { whitelist: DEV_SERVER });
      await openPage(page, '/points/list');

      await expect(h1(page)).toHaveText(either((t) => t.dp.points));
      await expect(page.getByRole('group', { name: either((t) => t.dp.filters) })).toBeVisible();
      await expect(page.locator('[data-fid="fab"]')).toBeVisible();

      const rows = await listRows(page);
      if (await rows.count()) {
        await rows.first().click();
        await page.waitForURL(/\/points\/\d+$/);
        await page.waitForLoadState('networkidle');
        await expectForm(page);
      }

      collector.assertNoErrors(expect, 'Point list');
    });

    test('create form: the detail pattern with the required fields marked', async ({ page }) => {
      const collector = createErrorCollector(page, { whitelist: DEV_SERVER });
      await openPage(page, '/points/create');

      await expect(h1(page)).toHaveText(either((t) => t.dp.create_point));
      await expectForm(page);
      await expect(page.locator('.basic-card .form-field .required')).toHaveCount(3);

      collector.assertNoErrors(expect, 'Point create');
    });

    test('type list: the edit dialog of the first custom type opens and cancels', async ({ page }) => {
      const collector = createErrorCollector(page, { whitelist: DEV_SERVER });
      await openPage(page, '/points/types');

      await expect(h1(page)).toHaveText(either((t) => t.dp.types));
      const rows = await listRows(page);
      const custom = rows.filter({ hasNot: page.locator('[data-column="lock"] svg') });
      if (await custom.count()) {
        await custom.first().click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('button', { name: either((t) => t.common.save) })).toBeVisible();
        await expect(dialog.getByRole('button', { name: either((t) => t.common.delete) })).toBeVisible();
        await dialog.getByRole('button', { name: either((t) => t.common.cancel) }).click();
        await expect(dialog).toHaveCount(0);
      }

      collector.assertNoErrors(expect, 'Point types');
    });
  });
}
