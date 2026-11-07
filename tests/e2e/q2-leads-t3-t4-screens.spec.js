const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { createErrorCollector } = require('../helpers/error-collector');
const en = require('../../src/i18n/locales/en.json');
const pl = require('../../src/i18n/locales/pl.json');
const { either: escapedEither } = require('./helpers/text');

/**
 * Q2 (@q2-t34): the CMS screens of outbound T3 and T4 — scoring profile, pilot, funnel/pilot report, reply routes,
 * reply steps, and the reply class in the timeline and the Inbox. Every test cleans up what it created (an inactive or
 * `q2-<run>` profile, a pilot it deleted, a reply route or action reset to the default it started from). The reply
 * class on a conversation needs a classified reply the stack does not hold yet, so that one test plays the two
 * answers (`conversations/`, `replies/`) itself: the app and the browser are real, the data is not.
 */

test.use({ viewport: { width: 1280, height: 720 } });

const either = (pick) => escapedEither(pick(en), pick(pl));
const ignoreNetwork = ({ status, url }) => status === 503 && url.includes('/api/enrichment/v2/admin/usage/month/');
const run = Date.now().toString(36);
const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10); // a licence switch two days away

async function openPage(page, path) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

async function pick(page, scope, testid, optionName) {
  await scope.getByTestId(testid).click();
  await page.getByRole('option', { name: optionName }).first().click();
}

const noSidewaysScroll = async (page, label, width) => {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll, `${label} overflows at ${width}px`).toBeLessThanOrEqual(inner);
};

test.describe('@q2-t34 Settings hub and reports entry', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('@q2-t34 the hub lists the new sections', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    await openPage(page, '/leads/settings');
    for (const key of ['reports', 'scoring', 'reply-routes', 'reply-actions']) await expect(page.getByTestId(`settings-${key}`)).toBeVisible();
    collector.assertNoErrors(expect, 'hub');
  });
});

test.describe('@q2-t34 Scoring profile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('@q2-t34 a profile is added with a rule and a disqualifier, edited, scored on a company, and deleted', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    const key = `q2-${run}`;
    await openPage(page, '/leads/settings/scoring');
    await expect(page.getByTestId('scoring-form')).toBeVisible();
    await page.getByTestId('scoring-key').locator('input').fill(key);
    await page.getByTestId('scoring-add-rules').click();
    await page.getByTestId('scoring-add-disqualifiers').click();
    const conds = page.getByTestId('scoring-cond');
    // rule: any company whose domain contains "." gets 30 points; disqualifier: a domain containing "never-matches"
    await pick(page, conds.nth(0), 'cond-field', either((t) => t.leads.scoring.fields.domain));
    await pick(page, conds.nth(0), 'cond-op', either((t) => t.leads.scoring.ops.contains));
    await conds.nth(0).getByTestId('cond-value').locator('input').fill('.');
    await conds.nth(0).getByTestId('cond-label').locator('input').fill('has a dot');
    await conds.nth(0).getByTestId('cond-points').locator('input').fill('30');
    await pick(page, conds.nth(1), 'cond-field', either((t) => t.leads.scoring.fields.domain));
    await pick(page, conds.nth(1), 'cond-op', either((t) => t.leads.scoring.ops.contains));
    await conds.nth(1).getByTestId('cond-value').locator('input').fill(`never-matches-${run}`);
    await conds.nth(1).getByTestId('cond-label').locator('input').fill('never');
    let created = false;
    try {
      await page.getByTestId('scoring-save').click();
      const row = page.getByTestId('scoring-row').filter({ hasText: key });
      await expect(row).toBeVisible();
      created = true;

      // edit: the saved rows come back into the form, a threshold changes
      await row.getByTestId('scoring-edit').click();
      await expect(page.getByTestId('scoring-cond').first().getByTestId('cond-value').locator('input')).toHaveValue('.');
      await page.getByTestId('scoring-threshold-L').locator('input').fill('75');
      await page.getByTestId('scoring-save').click();
      await expect(row).toContainText('75');

      // "Score now" on a company, under this (only active) profile: S1 to S4 and a reason on the card and the timeline
      await openPage(page, '/leads/companies');
      if (await page.getByTestId('companies-item').count()) {
        await page.getByTestId('companies-item').first().click();
        await page.waitForURL(/\/leads\/companies\/\d+/);
        await expect(page.getByTestId('company-score')).toBeVisible();
        await page.getByTestId('score-run').click();
        await expect(page.getByTestId('score-segment')).toBeVisible();
        await expect(page.getByTestId('score-reasons')).toContainText('has a dot');
        await page.reload();
        await page.waitForLoadState('networkidle');
        await expect(page.getByTestId('score-segment')).toBeVisible(); // now read from the timeline
        await expect(page.getByTestId('activity-reasons').first()).toContainText('has a dot');
      }
    } finally {
      if (created) {
        await openPage(page, '/leads/settings/scoring');
        const leftover = page.getByTestId('scoring-row').filter({ hasText: key });
        if (await leftover.count()) await leftover.getByTestId('scoring-delete').click();
        await expect(page.getByTestId('scoring-row').filter({ hasText: key })).toHaveCount(0);
      }
    }
    collector.assertNoErrors(expect, 'scoring');
  });

  test('@q2-t34 a form the API would refuse is refused first', async ({ page }) => {
    await openPage(page, '/leads/settings/scoring');
    await page.getByTestId('scoring-threshold-S').locator('input').fill('90');
    await page.getByTestId('scoring-save').click();
    await expect(page.getByTestId('scoring-form-error')).toHaveText(either((t) => t.leads.scoring.thresholds_order));
  });
});

test.describe('@q2-t34 Pilot on the company card', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('@q2-t34 a pilot is started, finished with a result and deleted; the report counts it', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    await openPage(page, '/leads/companies');
    test.skip((await page.getByTestId('companies-item').count()) === 0, 'the stack holds no company');
    await page.getByTestId('companies-item').first().click();
    await page.waitForURL(/\/leads\/companies\/(\d+)/);
    await page.getByTestId('company-tab-pilot').click();
    await expect(page.getByTestId('company-pilot')).toBeVisible();
    const criterion = `q2 ${run}: 10 orders`;
    await page.getByTestId('pilot-criterion-input').locator('textarea').fill(criterion);
    await page.getByTestId('pilot-end').locator('input').fill('2099-01-31');
    await page.getByTestId('pilot-save').click();
    const row = page.getByTestId('pilot-row').filter({ hasText: criterion });
    try {
      await expect(row).toBeVisible();
      await expect(row.getByTestId('pilot-result')).toHaveText(either((t) => t.leads.pilot.results.pending));

      await row.getByTestId('pilot-edit').click();
      await pick(page, page.getByTestId('pilot-form'), 'pilot-result-input', either((t) => t.leads.pilot.results.success));
      await page.getByTestId('pilot-note-input').locator('textarea').fill('Beat the target');
      await page.getByTestId('pilot-license').locator('input').fill(soon);
      await page.getByTestId('pilot-save').click();
      await expect(row.getByTestId('pilot-result')).toHaveText(either((t) => t.leads.pilot.results.success));
      await expect(row.getByTestId('pilot-note')).toHaveText('Beat the target');
      await expect(row.getByTestId('pilot-switch-date')).toContainText(soon);

      // the result change is written to the company timeline by the server
      await page.getByTestId('company-tab-overview').click();
      await expect(page.getByTestId('company-overview')).toContainText(/pilot/i);

      // the report counts it
      await openPage(page, '/leads/reports');
      await expect(page.getByTestId('pilot-total')).toBeVisible();
      await expect(page.getByTestId('pilot-switch')).toContainText(soon);
    } finally {
      await page.goBack().catch(() => {});
      await page.goto(page.url().includes('/leads/reports') ? '/leads/companies' : page.url());
      await page.waitForLoadState('networkidle');
      if (!/\/leads\/companies\/\d+/.test(page.url())) {
        await page.getByTestId('companies-item').first().click();
        await page.waitForURL(/\/leads\/companies\/\d+/);
      }
      await page.getByTestId('company-tab-pilot').click();
      const leftover = page.getByTestId('pilot-row').filter({ hasText: criterion });
      if (await leftover.count()) await leftover.getByTestId('pilot-delete').click();
      await expect(page.getByTestId('pilot-row').filter({ hasText: criterion })).toHaveCount(0);
    }
    collector.assertNoErrors(expect, 'pilot');
  });
});

test.describe('@q2-t34 Reports', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('@q2-t34 the funnel is read per stage and per origin, the pilot report beside it', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    await openPage(page, '/leads/reports');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(either((t) => t.leads.reports.title));
    await expect(page.getByTestId('funnel-companies')).toBeVisible();
    await expect(page.getByTestId('funnel-stage').first()).toBeVisible();
    await expect(page.getByTestId('pilot-total')).toBeVisible();

    // an origin filter reloads the funnel with that origin (or none) and keeps the page standing
    await page.getByTestId('funnel-origin').click();
    const options = page.getByRole('option');
    await expect(options.first()).toHaveText(either((t) => t.leads.reports.origin_all));
    if ((await options.count()) > 1) {
      const answered = page.waitForResponse((r) => r.url().includes('/reports/funnel/') && r.url().includes('origin='));
      await options.nth(1).click();
      expect((await answered).status()).toBe(200);
      await expect(page.getByTestId('funnel-companies')).toBeVisible();
    } else {
      await page.keyboard.press('Escape');
    }
    collector.assertNoErrors(expect, 'reports');
  });
});

test.describe('@q2-t34 Reply routes and reply steps', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('@q2-t34 a reply route is changed for one class, kept after a reload, and put back to the default', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    await openPage(page, '/leads/settings/reply-routes');
    const cards = page.locator('[data-testid^="route-"]').filter({ has: page.getByTestId('route-action') });
    await expect(cards).toHaveCount(7);
    // a class still on the default, so the reset below restores exactly what was there
    const intent = (await cards.filter({ has: page.getByTestId('route-default') }).first().getAttribute('data-testid')).replace('route-', '');
    const card = page.getByTestId(`route-${intent}`);
    try {
      await pick(page, card, 'route-action', either((t) => t.leads.reply_routes.action.none));
      await card.getByTestId('route-flag').click();
      await card.getByTestId('route-save').click();
      await expect(card.getByTestId('route-message')).toHaveText(either((t) => t.leads.reply_routes.saved));
      await expect(card.getByTestId('route-default')).toHaveCount(0);
      await page.reload();
      await page.waitForLoadState('networkidle');
      const again = page.getByTestId(`route-${intent}`);
      await expect(again.getByTestId('route-flag').getByRole('switch')).toHaveAttribute('aria-checked', 'true');
      await expect(again.getByTestId('route-reset')).toBeVisible();
    } finally {
      await openPage(page, '/leads/settings/reply-routes');
      const reset = page.getByTestId(`route-${intent}`).getByTestId('route-reset');
      if (await reset.count()) await reset.click();
      await expect(page.getByTestId(`route-${intent}`).getByTestId('route-default')).toBeVisible();
    }
    collector.assertNoErrors(expect, 'reply routes');
  });

  test('@q2-t34 a stage move needs its stage; the API refusal shows on the card', async ({ page }) => {
    await openPage(page, '/leads/settings/reply-routes');
    const card = page.getByTestId('route-interested');
    await pick(page, card, 'route-action', either((t) => t.leads.reply_routes.action.stage));
    await card.getByTestId('route-save').click();
    await expect(card.getByTestId('route-message')).toHaveText(either((t) => t.leads.reply_routes.stage_required));
  });

  test('@q2-t34 a reply step is changed for one class and put back; out of office offers pause until return', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    await openPage(page, '/leads/settings/reply-actions');
    const cards = page.locator('[data-testid^="action-"]').filter({ has: page.getByTestId('action-sequence') });
    await expect(cards).toHaveCount(7);

    await page.getByTestId('action-out_of_office').getByTestId('action-sequence').click();
    await expect(page.getByRole('option', { name: either((t) => t.communicator.reply_actions.sequence_value.pause_until_return) })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByTestId('action-interested').getByTestId('action-sequence').click();
    await expect(page.getByRole('option', { name: either((t) => t.communicator.reply_actions.sequence_value.pause_until_return) })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('action-unsubscribe').getByTestId('action-suppress')).toBeVisible();
    await expect(page.getByTestId('action-interested').getByTestId('action-suppress')).toHaveCount(0);

    const intent = (await cards.filter({ has: page.getByTestId('action-default') }).first().getAttribute('data-testid')).replace('action-', '');
    const card = page.getByTestId(`action-${intent}`);
    try {
      await pick(page, card, 'action-notify', either((t) => t.communicator.reply_actions.notify_value.low));
      await card.getByTestId('action-remind').locator('input').fill('3');
      await card.getByTestId('action-save').click();
      await expect(card.getByTestId('action-message')).toHaveText(either((t) => t.communicator.reply_actions.saved));
      await page.reload();
      await page.waitForLoadState('networkidle');
      const again = page.getByTestId(`action-${intent}`);
      await expect(again.getByTestId('action-remind').locator('input')).toHaveValue('3');
      await expect(again.getByTestId('action-default')).toHaveCount(0);
    } finally {
      await openPage(page, '/leads/settings/reply-actions');
      const reset = page.getByTestId(`action-${intent}`).getByTestId('action-reset');
      if (await reset.count()) await reset.click();
      await expect(page.getByTestId(`action-${intent}`).getByTestId('action-default')).toBeVisible();
    }
    collector.assertNoErrors(expect, 'reply actions');
  });
});

test.describe('@q2-t34 Reply class in the Inbox and the timeline', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // The stack holds no classified reply yet (the toolbox is a stub or off): the two answers are played here.
  test('@q2-t34 a replied conversation shows its class in the Inbox and on the thread bubble', async ({ page }) => {
    const reply = {
      id: 501, thread_id: 777, message_id: null, from_email: 'anna@example-shop.test', subject: 'Re: audit', body_text: 'Please write again in October',
      kind: 'reply', matched_by: 'header', inbound_message_id: '<x@y>', received_at: '2026-11-01T09:00:00Z', optout_confirmed_at: null,
      intent: 'not_now', intent_confidence: 0.88, intent_source: 'toolbox', intent_return_date: null, needs_review: true, action_applied: {},
      resume_at: null, resumed_at: null, remind_at: null, reminded_at: null,
    };
    const row = {
      id: 777, subject_ref: 'bdd:q2-t34', recipient_email: 'anna@example-shop.test', recipient_name: 'Anna', status: 'replied', last_message_at: reply.received_at,
      activity_at: reply.received_at, subject: 'Your audit', last_text: 'Please write again in October', draft: null, waiting: null, replied: true, thread_count: 1,
    };
    const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    await page.route('**/communicator/v2/admin/*/conversations/**', (route) =>
      route.fulfill(json({ count: 1, next: null, previous: null, results: [row], counts: { all: 1, draft: 0, waiting: 0, replied: 1 } }))
    );
    await page.route('**/communicator/v2/admin/*/replies/**', (route) => route.fulfill(json({ count: 1, next: null, previous: null, results: [reply] })));
    await page.route('**/communicator/v2/admin/*/threads/777/', (route) =>
      route.fulfill(
        json({
          id: 777, subject_ref: 'bdd:q2-t34', recipient_email: row.recipient_email, recipient_name: 'Anna', status: 'replied', last_message_at: reply.received_at, sequence: null,
          timeline: [
            { kind: 'message', message_id: 1, at: '2026-10-30T09:00:00Z', direction: 'out', status: 'sent', subject: 'Your audit', body_text: 'Hello', from_email: '', reply_kind: '' },
            { kind: 'reply', message_id: null, at: reply.received_at, direction: 'in', status: '', subject: 'Re: audit', body_text: reply.body_text, from_email: reply.from_email, reply_kind: 'reply' },
          ],
        })
      )
    );
    await page.route('**/communicator/v2/admin/*/messages/**', (route) => route.fulfill(json({ count: 0, next: null, previous: null, results: [] })));
    await openPage(page, '/leads/inbox');
    await page.getByTestId('inbox-filter-replied').click();
    await expect(page.getByTestId('inbox-intent')).toHaveAttribute('data-intent', 'not_now');
    await expect(page.getByTestId('inbox-intent')).toHaveText(either((t) => t.leads.intent.not_now));
    await page.getByTestId('inbox-item').first().click();
    await expect(page.getByTestId('timeline-intent')).toBeVisible();
    await expect(page.getByTestId('timeline-intent')).toContainText(/not now|nie teraz/i);
    await expect(page.getByTestId('timeline-intent')).toContainText('88');
    await expect(page.getByTestId('timeline-intent-review')).toBeVisible();
  });
});

for (const [name, width, height] of [['phone', 390, 844], ['tablet', 820, 1180]]) {
  test.describe(`@q2-t34 ${name} (${width}px)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height });
      await login(page);
    });

    test(`@q2-t34 the new screens fit a ${name} without sideways scroll`, async ({ page }) => {
      for (const path of ['/leads/reports', '/leads/settings/scoring', '/leads/settings/reply-routes', '/leads/settings/reply-actions']) {
        await openPage(page, path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await noSidewaysScroll(page, path, width);
      }
    });

    test(`@q2-t34 the scoring rows stay usable on a ${name}`, async ({ page }) => {
      await openPage(page, '/leads/settings/scoring');
      await page.getByTestId('scoring-add-rules').click();
      const cond = page.getByTestId('scoring-cond').first();
      for (const id of ['cond-field', 'cond-op', 'cond-value', 'cond-label', 'cond-points', 'cond-remove']) await expect(cond.getByTestId(id)).toBeVisible();
      const box = await cond.boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await noSidewaysScroll(page, 'scoring rule row', width);
    });
  });
}
