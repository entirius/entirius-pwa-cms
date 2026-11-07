const { test, expect, request: pwRequest } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { createErrorCollector } = require('../helpers/error-collector');
const en = require('../../src/i18n/locales/en.json');
const pl = require('../../src/i18n/locales/pl.json');
const { either: escapedEither, escapeRegExp } = require('./helpers/text');

/**
 * Q11 (@q11): sender routes, the approval inbox, address checks and the do-not-contact screens. Runs against the
 * temporary API that serves the q3 + q5 backend branches (CMS_API_URL, default http://localhost:8193): every test makes
 * its own routes, drafts, companies and contacts (`q11-<run>`), and removes the routes it made. Drafts are rejected or
 * approved by the test; a do-not-contact entry has no undo in the API, so it is made on a throw-away address.
 */

test.use({ viewport: { width: 1280, height: 720 } });

const API = process.env.CMS_API_URL || 'http://localhost:8193';
const CH = 'default-europe';
const either = (pick) => escapedEither(pick(en), pick(pl));
const contains = (pick) => new RegExp(`(${escapeRegExp(pick(en))}|${escapeRegExp(pick(pl))})`);
// the 503 of the toolbox-off usage endpoint (known) and the 409 of deleting the default route (the test asks for it)
const ignoreNetwork = ({ status, url }) => (status === 503 && url.includes('/api/enrichment/v2/admin/usage/month/')) || (status === 409 && /\/routes\/[^/]+\/$/.test(url));
const run = Date.now().toString(36);
const FOOTER = 'Unsubscribe: reply STOP.';

async function apiContext() {
  const anon = await pwRequest.newContext({ baseURL: API });
  const res = await anon.post(`/api/accounts/v1/${CH}/customer/tokens/`, {
    data: { email: process.env.VUE_APP_USERNAME || 'admin', password: process.env.VUE_APP_PASSWORD || 'admin123' },
  });
  const access = (await res.json()).data.access;
  await anon.dispose();
  return pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { Authorization: `Bearer ${access}` } });
}

const comm = (path) => `/api/communicator/v2/admin/${CH}/${path}`;
const leads = (path) => `/api/leads/v2/admin/${CH}/${path}`;

async function makeRoute(api, key, fields = {}) {
  const res = await api.post(comm('routes/'), { data: { key, name: `Q11 ${key}`, from_email: `${key}@q11.example.test`, ...fields } });
  expect(res.status(), await res.text()).toBe(201);
}

async function makeDraft(api, route, tag) {
  const res = await api.post(comm('test/communicate/'), {
    data: {
      template_key: 'followup',
      recipient: { email: `${tag}@q11-shop.example.test`, first_name: 'Jan', language: 'pl', legal_footer: FOOTER },
      context: { company_name: `Q11 Shop ${tag}`, body: 'Q11 test message.' },
      subject_ref: `q11:${tag}`,
      requires_review: true,
      sender_route: route,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).id;
}

async function makeCompany(api, tag, fields = {}) {
  const res = await api.post(leads('companies/'), { data: { domain: `${tag}-q11.test`, name: `Q11 ${tag}`, ...fields } });
  expect(res.status(), await res.text()).toBe(201);
  return res.json();
}

async function makeContact(api, companyId, email) {
  const res = await api.post(leads('contacts/'), { data: { company_id: companyId, email, first_name: 'Ola', legal_basis: 'legitimate_interest' } });
  expect(res.status(), await res.text()).toBe(201);
  return res.json();
}

async function openPage(page, path) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

async function pick(page, testid, optionName) {
  await page.getByTestId(testid).click();
  await page.getByRole('option', { name: optionName }).first().click();
}

const noSidewaysScroll = async (page, label, width) => {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll, `${label} overflows at ${width}px`).toBeLessThanOrEqual(inner);
};

let api;
test.beforeAll(async () => {
  api = await apiContext();
});
test.afterAll(async () => {
  await api.dispose();
});

test.describe('@q11 hub and navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('@q11 the hub lists routes, address checks and do-not-contact; Approvals is in the navigation', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    await openPage(page, '/leads/settings');
    for (const key of ['routes', 'addresses', 'do-not-contact']) await expect(page.getByTestId(`settings-${key}`)).toBeVisible();
    await expect(page.locator('a[href="/leads/approvals"]').first()).toBeVisible();
    collector.assertNoErrors(expect, 'hub');
  });

  test('@q11 the Approvals entry shows how many drafts wait', async ({ page }) => {
    const key = `q11r${run}a`;
    await makeRoute(api, key);
    const ids = [await makeDraft(api, key, `${key}-1`), await makeDraft(api, key, `${key}-2`)];
    try {
      await openPage(page, '/leads/inbox');
      await expect(page.getByTestId('sidebar-nav-count').first()).toBeVisible();
      const count = Number(await page.getByTestId('sidebar-nav-count').first().innerText());
      expect(count).toBeGreaterThanOrEqual(2);
    } finally {
      await api.post('/api/communicator/v2/admin/approvals/bulk/', { data: { action: 'reject', ids, reason: 'q11 cleanup' } });
      await api.delete(comm(`routes/${key}/`));
    }
  });
});

test.describe('@q11 Sender routes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('@q11 a route is added with a DW mailbox, limit and warm-up, edited, made the default and deleted', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    const key = `q11r${run}b`;
    await openPage(page, '/leads/settings/routes');
    await expect(page.getByTestId('route-form')).toBeVisible();
    await page.getByTestId('route-key').locator('input').fill(key);
    await page.getByTestId('route-name').locator('input').fill(`Q11 ${key}`);
    await page.getByTestId('route-from').locator('input').fill(`${key}@q11.example.test`);
    await page.getByTestId('route-cc').locator('input').fill(`dw-${key}@q11.example.test`);
    await page.getByTestId('route-daily-cap').locator('input').fill('40');
    await page.getByTestId('route-warmup-start').locator('input').fill('5');
    await page.getByTestId('route-warmup-step').locator('input').fill('5');
    let created = false;
    try {
      await page.getByTestId('route-save').click();
      const row = page.getByTestId('route-row').filter({ hasText: key });
      await expect(row).toBeVisible();
      created = true;
      await expect(row).toContainText(`${key}@q11.example.test`);
      await expect(row).toContainText(`dw-${key}@q11.example.test`);
      await expect(row.getByTestId('route-warmup-badge')).toBeVisible();
      await expect(row.getByTestId('route-cap')).toContainText('/ 5'); // the warm-up shapes today's limit: 5, not 40

      // edit: the form takes the route back, the limit changes
      await row.getByTestId('route-edit').click();
      await expect(page.getByTestId('route-from').locator('input')).toHaveValue(`${key}@q11.example.test`);
      await page.getByTestId('route-daily-cap').locator('input').fill('60');
      await page.getByTestId('route-save').click();
      await expect(page.getByTestId('route-form-error')).toHaveCount(0);

      // default: this one, then none again; the channel keeps it after a reload
      await row.getByTestId('route-make-default').click();
      await expect(page.getByTestId('routes-default-line')).toContainText(key);
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId('route-row').filter({ hasText: key }).getByTestId('route-default-badge')).toBeVisible();
      // the default route cannot be deleted
      await page.getByTestId('route-row').filter({ hasText: key }).getByTestId('route-delete').click();
      await page.getByTestId('confirm-dialog-confirm').click();
      await expect(page.getByTestId('route-error')).toContainText(contains((t) => t.communicator.routes.err_is_default));
      await page.getByTestId('route-clear-default').click();
      await expect(page.getByTestId('routes-default-line')).toContainText(contains((t) => t.communicator.routes.default_none));
    } finally {
      if (created) {
        await api.patch(comm('channel/'), { data: { default_sender_route: '' } });
        await api.patch(leads('settings/'), { data: { default_sender_route: '' } });
        await api.delete(comm(`routes/${key}/`));
      }
    }
    collector.assertNoErrors(expect, 'routes');
  });

  test('@q11 a form the API would refuse is refused first', async ({ page }) => {
    await openPage(page, '/leads/settings/routes');
    await page.getByTestId('route-key').locator('input').fill('Bad Key');
    await page.getByTestId('route-save').click();
    await expect(page.getByTestId('route-form-error')).toHaveText(either((t) => t.communicator.routes.key_invalid));
  });

  test('@q11 the import offers the routes and sends the chosen one with the file', async ({ page }) => {
    const key = `q11r${run}c`;
    await makeRoute(api, key);
    try {
      await page.setViewportSize({ width: 1280, height: 720 });
      await openPage(page, '/leads/import');
      await expect(page.getByTestId('import-route')).toBeVisible();
      await pick(page, 'import-route', new RegExp(key));
      await page.getByTestId('import-file').setInputFiles({ name: 'q11.csv', mimeType: 'text/csv', buffer: Buffer.from(`company_name,domain\nQ11 Import,q11imp${run}.example.test\n`) });
      const posted = page.waitForResponse((res) => res.url().endsWith('/imports/') && res.request().method() === 'POST');
      await page.getByTestId('import-upload').click();
      const batch = await (await posted).json();
      expect(batch.sender_route).toBe(key);
    } finally {
      await api.delete(comm(`routes/${key}/`));
    }
  });

  test('@q11 companies are picked and moved to a route in one go', async ({ page }) => {
    const key = `q11r${run}d`;
    await makeRoute(api, key);
    const a = await makeCompany(api, `q11bulk${run}a`);
    const b = await makeCompany(api, `q11bulk${run}b`);
    try {
      await openPage(page, '/leads/companies');
      await page.getByTestId('companies-search').locator('input').fill(`q11bulk${run}`);
      await page.getByTestId('companies-search').locator('input').press('Enter');
      await expect(page.getByTestId('companies-item')).toHaveCount(2);
      await page.getByTestId('companies-select-mode').click();
      await page.getByTestId('companies-select-all').click();
      await expect(page.getByTestId('companies-selected')).toContainText('2');
      await pick(page, 'companies-bulk-route', new RegExp(key));
      await page.getByTestId('companies-bulk-apply').click();
      await expect(page.getByTestId('companies-bulk-message')).toBeVisible();
      for (const company of [a, b]) {
        const got = await (await api.get(leads(`companies/${company.id}/`))).json();
        expect(got.sender_route).toBe(key);
      }
    } finally {
      await api.delete(comm(`routes/${key}/`));
    }
  });
});

test.describe('@q11 Approvals', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('@q11 drafts of several routes in one list; filter by route; select and approve; the log records it', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    const k1 = `q11r${run}e`;
    const k2 = `q11r${run}f`;
    await makeRoute(api, k1);
    await makeRoute(api, k2);
    const mine = [await makeDraft(api, k1, `${k1}-1`), await makeDraft(api, k1, `${k1}-2`), await makeDraft(api, k2, `${k2}-1`)];
    try {
      await openPage(page, '/leads/approvals');
      await page.getByTestId('approvals-search').locator('input').fill(`q11-shop.example.test`);
      await expect(page.getByTestId('approval-row').first()).toBeVisible();
      for (const id of mine) await expect(page.locator(`[data-testid="approval-row"][data-id="${id}"]`)).toBeVisible();

      // filter by the second route: one row
      await pick(page, 'approvals-route', new RegExp(k2));
      await expect(page.getByTestId('approval-row')).toHaveCount(1);
      await expect(page.getByTestId('approval-route')).toHaveText(k2);

      // back to all routes, tick two and approve them
      await pick(page, 'approvals-route', either((t) => t.leads.approvals.any_route));
      await expect(page.getByTestId('approval-row')).toHaveCount(3);
      const rows = page.getByTestId('approval-row').filter({ hasText: k1 });
      await rows.nth(0).getByTestId('approval-select').click();
      await rows.nth(1).getByTestId('approval-select').click();
      await expect(page.getByTestId('approvals-selected')).toContainText('2');
      await page.getByTestId('approvals-approve').click();
      await expect(page.getByTestId('approvals-result')).toBeVisible();
      await expect(page.getByTestId('approval-row')).toHaveCount(1);

      // the third one is rejected with a reason, through the confirmation
      await page.getByTestId('approval-select').click();
      await page.getByTestId('approvals-reject').click();
      await page.getByTestId('approvals-reject-reason').locator('input').fill('q11 not now');
      await page.getByTestId('approvals-reject-confirm').click();
      await expect(page.getByTestId('approval-row')).toHaveCount(0);

      // the log lists both bulk calls, newest first
      await page.getByTestId('approvals-view-log').click();
      const entries = page.getByTestId('approvals-log-row');
      await expect(entries.first()).toHaveAttribute('data-action', 'reject');
      await expect(entries.nth(1)).toHaveAttribute('data-action', 'approve');
    } finally {
      await api.post('/api/communicator/v2/admin/approvals/bulk/', { data: { action: 'reject', ids: mine, reason: 'q11 cleanup' } });
      await api.delete(comm(`routes/${k1}/`)).catch(() => {});
      await api.delete(comm(`routes/${k2}/`)).catch(() => {});
    }
    collector.assertNoErrors(expect, 'approvals');
  });

  test('@q11 a draft whose route is gone shows why it cannot be approved, and can still be rejected', async ({ page }) => {
    const key = `q11r${run}g`;
    await makeRoute(api, key);
    const id = await makeDraft(api, key, `${key}-1`);
    await api.delete(comm(`routes/${key}/`));
    try {
      await openPage(page, '/leads/approvals');
      await page.getByTestId('approvals-search').locator('input').fill(`${key}-1@`);
      const row = page.locator(`[data-testid="approval-row"][data-id="${id}"]`);
      await expect(row).toBeVisible();
      await expect(row).toHaveAttribute('data-blocked', 'yes');
      await expect(row.getByTestId('approval-blocker')).toContainText(key);
      await row.getByTestId('approval-select').click();
      await expect(page.getByTestId('approvals-approve')).toBeDisabled();
      await expect(page.getByTestId('approvals-blocked-note')).toBeVisible();
      await page.getByTestId('approvals-reject').click();
      await page.getByTestId('approvals-reject-confirm').click();
      await expect(row).toHaveCount(0);
    } finally {
      await api.post('/api/communicator/v2/admin/approvals/bulk/', { data: { action: 'reject', ids: [id], reason: 'q11 cleanup' } });
    }
  });

  test('@q11 the keyboard: j moves, Enter previews, x selects, a approves', async ({ page }) => {
    const key = `q11r${run}h`;
    await makeRoute(api, key);
    const ids = [await makeDraft(api, key, `${key}-1`), await makeDraft(api, key, `${key}-2`)];
    try {
      await openPage(page, '/leads/approvals');
      await page.getByTestId('approvals-search').locator('input').fill(`${key}-`);
      await expect(page.getByTestId('approval-row')).toHaveCount(2);
      await page.locator('body').click({ position: { x: 5, y: 5 } });
      await page.keyboard.press('j');
      await expect(page.getByTestId('approval-row').nth(1)).toHaveAttribute('aria-current', 'true');
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('approval-preview')).toContainText('Q11 test message');
      await page.keyboard.press('k');
      await page.keyboard.press('a'); // the row under the cursor, no selection needed
      await expect(page.getByTestId('approval-row')).toHaveCount(1);
      await page.keyboard.press('x');
      await expect(page.getByTestId('approvals-selected')).toContainText('1');
      await page.keyboard.press('a');
      await expect(page.getByTestId('approval-row')).toHaveCount(0);
    } finally {
      await api.post('/api/communicator/v2/admin/approvals/bulk/', { data: { action: 'reject', ids, reason: 'q11 cleanup' } });
      await api.delete(comm(`routes/${key}/`));
    }
  });
});

test.describe('@q11 Address checks and do not contact', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('@q11 the report counts, the bad list and Check now on one address', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    const company = await makeCompany(api, `q11addr${run}`);
    const contact = await makeContact(api, company.id, `ola@q11addr${run}.example.com`);
    // The API checks it now; the list we look at is whichever status it ended in (a lookup error gives unknown)
    const verified = await (await api.post(leads(`contacts/${contact.id}/verify/`), { data: {} })).json();
    expect(['invalid', 'unknown', 'risky']).toContain(verified.email_status);
    await openPage(page, '/leads/settings/addresses');
    await expect(page.getByTestId('addresses-report')).toBeVisible();
    for (const status of ['valid', 'risky', 'invalid', 'unknown']) await expect(page.getByTestId(`addresses-count-${status}`)).toBeVisible();
    await page.getByTestId(`addresses-filter-${verified.email_status === 'valid' ? 'unknown' : verified.email_status}`).click();
    const row = page.getByTestId('address-row').filter({ hasText: `q11addr${run}` });
    await expect(row.first()).toBeVisible({ timeout: 15000 });
    await expect(row.first().getByTestId('address-status')).toBeVisible();
    await row.first().getByTestId('address-check').click();
    await expect(page.getByTestId('addresses-notice')).toBeVisible();
    collector.assertNoErrors(expect, 'addresses');
  });

  test('@q11 the contact card shows the status; Why not? lists the reasons; Do not contact blocks the address for good', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    const company = await makeCompany(api, `q11dnc${run}`);
    const email = `ola@q11dnc${run}.example.com`;
    const contact = await makeContact(api, company.id, email);
    await openPage(page, `/leads/companies/${company.id}?tab=contacts`);
    const row = page.locator(`[data-testid="contact-row"][data-contact="${contact.id}"]`);
    await expect(row.getByTestId('address-status')).toBeVisible();
    await row.getByTestId('contact-verify').click();
    await expect(page.getByTestId('contact-status')).toBeVisible();

    // before: the report says what it says; after the entry it names the opt-out
    await row.getByTestId('contact-dnc').click();
    await expect(page.getByTestId('dnc-warning')).toBeVisible();
    await page.getByTestId('dnc-confirm').click();
    await expect(page.getByTestId('dnc-error')).toHaveText(either((t) => t.leads.dnc.reason_required));
    await page.getByTestId('dnc-reason').locator('input').fill('q11 asked by phone');
    await page.getByTestId('dnc-confirm').click();
    await expect(page.getByTestId('dnc-warning')).toHaveCount(0);
    await expect(page.getByTestId('contact-status')).toContainText(email);
    const check = await (await api.get(leads(`contacts/${contact.id}/send-check/`))).json();
    expect(check.eligible).toBe(false);
    expect(check.reasons).toContain('opted_out');

    await row.getByTestId('contact-why').click();
    await expect(page.getByTestId('sendcheck-verdict')).toBeVisible();
    await expect(page.locator('[data-testid="sendcheck-reason"][data-reason="opted_out"]')).toBeVisible();
    await page.getByTestId('sendcheck-close').click();

    // the shared list shows it and has no way to take it off
    await openPage(page, '/leads/settings/do-not-contact');
    await expect(page.getByTestId('dnc-contacts')).toContainText(email);
    await expect(page.getByRole('button', { name: /remove|usuń/i })).toHaveCount(0);
    collector.assertNoErrors(expect, 'dnc');
  });
});

for (const [name, width, height] of [['phone', 390, 844], ['tablet', 820, 1180]]) {
  test.describe(`@q11 ${name} (${width}px)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height });
      await login(page);
    });

    test(`@q11 the new screens fit a ${name} without sideways scroll`, async ({ page }) => {
      const key = `q11r${run}${name[0]}`;
      await makeRoute(api, key, { cc_email: 'a-very-long-dw-mailbox-name-for-a-narrow-screen@q11.example.test' });
      const ids = [await makeDraft(api, key, `${key}-1`), await makeDraft(api, key, `${key}-2`)];
      try {
        for (const path of ['/leads/approvals', '/leads/settings/routes', '/leads/settings/addresses', '/leads/settings/do-not-contact', '/leads/companies']) {
          await openPage(page, path);
          await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
          await noSidewaysScroll(page, path, width);
        }
        // the approvals list with a selection: the action bar fits, its buttons are reachable
        await openPage(page, '/leads/approvals');
        await page.getByTestId('approvals-search').locator('input').fill(`${key}-`);
        await expect(page.getByTestId('approval-row')).toHaveCount(2);
        await page.getByTestId('approval-select').first().click();
        await expect(page.getByTestId('approvals-bar')).toBeVisible();
        await expect(page.getByTestId('approvals-approve')).toBeVisible();
        await expect(page.getByTestId('approvals-reject')).toBeVisible();
        const box = await page.getByTestId('approvals-bar').boundingBox();
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        await noSidewaysScroll(page, 'approvals with a selection', width);
        // the company list in select mode
        await openPage(page, '/leads/companies');
        await page.getByTestId('companies-select-mode').click();
        await expect(page.getByTestId('companies-bulk')).toBeVisible();
        await noSidewaysScroll(page, 'companies select mode', width);
      } finally {
        await api.post('/api/communicator/v2/admin/approvals/bulk/', { data: { action: 'reject', ids, reason: 'q11 cleanup' } });
        await api.delete(comm(`routes/${key}/`));
      }
    });
  });
}
