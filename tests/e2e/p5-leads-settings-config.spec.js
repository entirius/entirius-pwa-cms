const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { createErrorCollector } = require('../helpers/error-collector');
const en = require('../../src/i18n/locales/en.json');
const pl = require('../../src/i18n/locales/pl.json');
const { either: escapedEither } = require('./helpers/text');

/**
 * S5 Leads → Settings: rules, analysis and recipient profiles, the IMAP mailbox — desktop. Creates, edits and deletes
 * its own rule and profiles (an inactive rule, keys `e2e-<run>`), so a failed run leaves at most those rows; the
 * mailbox is only re-saved with the values it holds (no password sent: the stored one is kept).
 */

test.use({ viewport: { width: 1280, height: 720 } });

const either = (pick) => escapedEither(pick(en), pick(pl));
// The usage badge in the shell asks the enrichment module; a stack without it answers 503 on every page, whatever the
// screen under test does. That one named refusal is not counted; every other error still is.
const ignoreNetwork = ({ status, url }) => status === 503 && url.includes('/api/enrichment/v2/admin/usage/month/');
const run = Date.now().toString(36);

async function openPage(page, path) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

async function pick(page, testid, optionName) {
  await page.getByTestId(testid).click();
  await page.getByRole('option', { name: optionName }).first().click();
}

test.describe('S5 Leads settings: rules, profiles, mailbox', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('the hub lists the three new sections', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    await openPage(page, '/leads/settings');
    for (const key of ['rules', 'profiles', 'mailbox']) await expect(page.getByTestId(`settings-${key}`)).toBeVisible();
    collector.assertNoErrors(expect, 'S5 settings');
  });

  test('a rule is added, edited and deleted', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    await openPage(page, '/leads/settings/rules');
    await expect(page.getByTestId('rule-form')).toBeVisible();
    const template = `e2e.${run}`;

    // Inactive, so the live rule engine never runs it.
    await pick(page, 'rule-trigger', either((t) => t.leads.rules.trigger.intel_ready));
    await pick(page, 'rule-action', either((t) => t.leads.rules.action.communicate));
    await page.getByTestId('rule-template').locator('input').fill(template);
    await page.getByTestId('rule-form-active').click();
    await page.getByTestId('rule-save').click();
    const row = page.getByTestId('rule-row').filter({ hasText: template });
    await expect(row).toBeVisible();

    await row.getByTestId('rule-edit').click();
    await page.getByTestId('rule-template').locator('input').fill(`${template}.b`);
    await page.getByTestId('rule-save').click();
    const edited = page.getByTestId('rule-row').filter({ hasText: `${template}.b` });
    await expect(edited).toBeVisible();

    await edited.getByTestId('rule-delete').click();
    await expect(page.getByTestId('rule-row').filter({ hasText: template })).toHaveCount(0);
    collector.assertNoErrors(expect, 'S5 settings');
  });

  test('an analysis and a recipient profile are added, edited and deleted', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    await openPage(page, '/leads/settings/profiles');
    for (const kind of ['analysis-profiles', 'recipient-profiles']) {
      const section = page.getByTestId(`profiles-${kind}`);
      const key = `e2e-${run}-${kind.slice(0, 3)}`;
      await section.getByTestId('profile-key').locator('input').fill(key);
      await section.getByTestId('profile-model').locator('input').fill('fake-chat');
      await section.getByTestId('profile-prompt').locator('textarea').fill('Prompt one');
      await section.getByTestId('profile-save').click();
      const row = section.getByTestId('profile-row').filter({ hasText: key });
      await expect(row).toBeVisible();

      await row.getByTestId('profile-edit').click();
      await expect(section.getByTestId('profile-prompt').locator('textarea')).toHaveValue('Prompt one');
      await section.getByTestId('profile-prompt').locator('textarea').fill('Prompt two');
      await section.getByTestId('profile-save').click();
      await expect(row).toBeVisible();
      await row.getByTestId('profile-edit').click();
      await expect(section.getByTestId('profile-prompt').locator('textarea')).toHaveValue('Prompt two');
      await section.getByTestId('profile-cancel').click();

      await row.getByTestId('profile-delete').click();
      await expect(section.getByTestId('profile-row').filter({ hasText: key })).toHaveCount(0);
    }
    collector.assertNoErrors(expect, 'S5 settings');
  });

  test('the mailbox opens with its values and saves them without the password', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    await openPage(page, '/leads/settings/mailbox');
    const host = page.getByTestId('mailbox-host').locator('input');
    await expect(page.getByTestId('mailbox-save')).toBeVisible();
    const configured = (await page.getByTestId('mailbox-empty').count()) === 0;
    if (!configured) {
      // Nothing to re-save without writing a mailbox of our own: only the refusal of an empty form is checked.
      await page.getByTestId('mailbox-save').click();
      await expect(host).toHaveValue('');
      return;
    }
    await expect(host).not.toHaveValue('');
    const before = await host.inputValue();
    const saved = page.waitForResponse((r) => r.url().includes('/mailbox/') && r.request().method() === 'PUT');
    await page.getByTestId('mailbox-save').click();
    expect((await saved).status()).toBe(200);
    await openPage(page, '/leads/settings/mailbox');
    await expect(host).toHaveValue(before);
    collector.assertNoErrors(expect, 'S5 settings');
  });
  // The 404 case ("no mailbox yet") must not touch the stack's real mailbox row, so the API is played by the test:
  // the browser, the built app and the request body are real, the answers are not.
  test('a mailbox that does not exist yet is created from an empty form', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork: (e) => ignoreNetwork(e) || e.status === 404 });
    let body = null;
    const saved = { imap_host: 'imap.mail.test', imap_port: 993, imap_use_ssl: true, imap_user: 'outreach', has_password: true, folder: 'INBOX', last_uid: 0, is_active: true, last_polled_at: null };
    await page.route('**/mailbox/', async (route) => {
      if (route.request().method() === 'PUT') {
        body = route.request().postDataJSON();
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(saved) });
      }
      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'NOT_FOUND', message: 'Mailbox not configured.' }) });
    });
    await openPage(page, '/leads/settings/mailbox');
    await expect(page.getByTestId('mailbox-empty')).toBeVisible();
    await expect(page.getByTestId('mailbox-folder').locator('input')).toHaveValue('INBOX');
    await page.getByTestId('mailbox-save').click();
    expect(body).toBeNull(); // the empty form is refused before any request
    await page.getByTestId('mailbox-host').locator('input').fill('imap.mail.test');
    await page.getByTestId('mailbox-user').locator('input').fill('outreach');
    await page.getByTestId('mailbox-password').locator('input').fill('s3cret');
    await page.getByTestId('mailbox-save').click();
    await expect(page.getByTestId('mailbox-empty')).toHaveCount(0);
    expect(body).toMatchObject({ imap_host: 'imap.mail.test', imap_port: 993, imap_user: 'outreach', imap_password: 's3cret', folder: 'INBOX' });
    await expect(page.getByTestId('mailbox-password').locator('input')).toHaveValue('');
    expect(collector.getErrors().exceptions).toEqual([]);
  });

  for (const [name, width, height] of [['phone', 375, 800], ['tablet', 768, 1000]]) {
    test(`the three screens fit a ${name} (${width}px) without sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      for (const path of ['rules', 'profiles', 'mailbox']) {
        await openPage(page, `/leads/settings/${path}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        expect(scroll, `${path} overflows at ${width}px`).toBeLessThanOrEqual(inner);
      }
    });
  }
});
