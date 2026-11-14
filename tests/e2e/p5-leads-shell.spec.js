const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { SUPERUSER } = require('./helpers/users');

/**
 * The Leads shell and its shared controls (plan 26, acceptance walk 3): an unknown Leads address is the not-found page
 * with a working way to Today; the old Company types address redirects; Escape in Edit task closes the calendar only
 * (the typed title survives, the dialog stays) and the calendar's week starts on Monday; a draft skipped in Review is
 * one closed line in its company's History. The spec makes its own company (run-unique domain), task and draft through
 * the API; the task is cancelled at the end (the todo API deletes none), the draft is skipped by the test itself, and
 * the API deletes no company, so every run leaves one `e2e-shell-<run>….test` company until the next `make seed`.
 * On a phone (plan 31, walk 4): Review confirms Skip in place — no toast over the action row — so the next draft's Send
 * can be clicked at once; the spec's two drafts end skipped.
 */

test.use({ viewport: { width: 1440, height: 900 } });

const API = process.env.VUE_APP_API_URL || 'http://localhost:8100';
const CHANNEL = process.env.VUE_APP_LEADS_CHANNEL || 'default-europe';
const LEADS = `${API}/api/leads/v2/admin/${CHANNEL}`;
const COMMUNICATOR = `${API}/api/communicator/v2/admin/${CHANNEL}`;
const TODO = `${API}/api/todo/v2/admin/${CHANNEL}`;
const LEGAL_FOOTER = 'Administrator danych: Example Seller sp. z o.o., ul. Testowa 1, Warszawa.';
const RUN = Date.now();

async function authHeaders(page) {
  const cookie = (await page.context().cookies()).find((c) => c.name === 'token');
  return { Authorization: `Bearer ${cookie.value}` };
}

async function api(page, method, url, data) {
  const response = await page.request.fetch(url, { method, headers: await authHeaders(page), data });
  expect(response.ok(), `${method} ${url}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}

async function createDraft(page, company, tag) {
  return api(page, 'POST', `${COMMUNICATOR}/test/communicate/`, {
    template_key: 'reply.thanks',
    subject_ref: `leads.Company:${company.id}`,
    subject_label: company.name,
    requires_review: true,
    recipient: { email: `${tag}@e2e-shell-${RUN}.test`, language: 'en', legal_footer: LEGAL_FOOTER },
    context: { company_name: company.name, body: `E2E shell draft ${tag}.` },
  });
}

async function createCompany(page, tag) {
  return api(page, 'POST', `${LEADS}/companies/`, { domain: `e2e-shell-${RUN}-${tag}.test`, name: `E2E shell ${RUN} ${tag}` });
}

test.describe('Leads shell (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ...SUPERUSER);
  });

  test('an unknown Leads address is the not-found page with a way to Today; the old Company types address redirects', async ({ page }) => {
    await page.goto('/leads/no-such-page/7');
    await expect(page.getByTestId('not-found')).toContainText('This page does not exist');
    await page.getByTestId('not-found-start').click();
    await expect(page).toHaveURL(/\/leads\/today$/);
    await expect(page.getByTestId('leads-today')).toBeVisible();

    await page.goto('/leads/settings/lead-types');
    await expect(page).toHaveURL(/\/leads\/settings\/company-types$/);
    await expect(page.getByTestId('leads-lead-types')).toBeVisible();
  });

  test('Edit task: Escape closes the calendar only, the typed title survives, the week starts on Monday', async ({ page }, testInfo) => {
    const company = await createCompany(page, `task-${testInfo.retry}`);
    const task = await api(page, 'POST', `${TODO}/tasks/`, {
      subject_ref: `leads.Company:${company.id}`,
      subject_label: company.name,
      title: `E2E task ${RUN}`,
    });
    try {
      await page.goto(`/leads/companies/${company.id}?tab=tasks`);
      await page.locator(`[data-testid="task-row"][data-task="${task.id}"] [data-testid="task-edit"]`).click();
      const dialog = page.getByTestId('task-dialog');
      await expect(dialog).toBeVisible();
      const title = dialog.getByTestId('task-title').locator('input');
      await title.fill(`E2E task ${RUN} — edited`);

      const picker = dialog.getByTestId('task-due-at').locator('xpath=ancestor-or-self::*[contains(@class, "basic-date-picker")][1]');
      await picker.locator('.basic-date-picker__trigger').click();
      const calendar = picker.locator('.flatpickr-calendar');
      await expect(calendar).toBeVisible();
      await expect(calendar.locator('.flatpickr-weekday').first()).toHaveText(/^\s*Mon\s*$/);

      await page.keyboard.press('Escape');
      await expect(calendar).toBeHidden();
      await expect(dialog).toBeVisible();
      await expect(title).toHaveValue(`E2E task ${RUN} — edited`);
    } finally {
      await api(page, 'POST', `${TODO}/tasks/${task.id}/cancel/`, { reason: 'e2e cleanup' });
    }
  });

  test('a draft skipped in Review is one closed line in the company History', async ({ page }, testInfo) => {
    const company = await createCompany(page, `skip-${testInfo.retry}`);
    const draft = await api(page, 'POST', `${COMMUNICATOR}/test/communicate/`, {
      template_key: 'reply.thanks',
      subject_ref: `leads.Company:${company.id}`,
      subject_label: company.name,
      requires_review: true,
      recipient: { email: `owner@e2e-shell-${RUN}.test`, language: 'en', legal_footer: LEGAL_FOOTER },
      context: { company_name: company.name, body: 'E2E shell draft.' },
    });
    expect(draft.status, 'the draft waits for review').toBe('review_required');

    await page.goto(`/leads/inbox/${draft.id}`);
    await expect(page.getByTestId('review-draft')).toBeVisible();
    await page.getByTestId('review-skip').click();
    await expect(page.getByText('Skipped — this mail will not be sent')).toBeVisible();

    await page.goto(`/leads/companies/${company.id}?tab=timeline`);
    const line = page.getByTestId('timeline-skipped-line');
    await expect(line).toHaveCount(1);
    await expect(line).toContainText('Draft skipped by');
    await line.click();
    await expect(page.locator('details.tl__skipped')).toHaveAttribute('open', '');
  });
});

test.describe('Leads shell (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await login(page, ...SUPERUSER);
  });

  test('Review: after Skip the next draft opens at once and its Send can be clicked, the line above it', async ({ page }, testInfo) => {
    const company = await createCompany(page, `phone-${testInfo.retry}`);
    const first = await createDraft(page, company, `first-${testInfo.retry}`);
    const second = await createDraft(page, company, `second-${testInfo.retry}`);
    try {
      await page.goto(`/leads/inbox/${first.id}`);
      await expect(page.getByTestId('review-draft')).toBeVisible();
      await page.getByTestId('review-skip').click();
      await expect(page.getByTestId('review-confirmation')).toHaveText('Skipped — this mail will not be sent');
      await expect(page).not.toHaveURL(new RegExp(`/leads/inbox/${first.id}$`));
      await expect(page.getByTestId('review-draft')).toBeVisible();
      // nothing lies over the action row: a trial click passes Playwright's hit test at once, well inside the 4 s line
      // (the next draft is the queue's; a seed draft with a problem has Send disabled by design — then its Skip)
      const send = page.getByTestId('review-send');
      const action = (await send.isEnabled()) ? send : page.getByTestId('review-skip');
      await action.click({ trial: true, timeout: 1500 });
      await expect(page.getByTestId('review-confirmation')).toBeVisible();
    } finally {
      for (const draft of [first, second]) {
        await page.request.post(`${COMMUNICATOR}/review/${draft.id}/skip/`, { headers: await authHeaders(page), data: { reason: 'e2e cleanup' } });
      }
    }
  });
});
