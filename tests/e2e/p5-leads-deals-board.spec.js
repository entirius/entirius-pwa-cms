const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { SUPERUSER } = require('./helpers/users');

/**
 * Leads deals board with a real pointer (plan 24, N15 and R2). The spec creates its own company (unowned, run-unique
 * domain) and three unowned deals through the API, opens the board on "Unassigned" and drags with `page.mouse`
 * (never a synthetic event): a deal to the next stage, a second one into an empty column, a third into Lost (the
 * reason dialog: Close puts the card back, then with a reason the card is in Lost), then a reload and one more drag.
 * After every drop the deal's stage is read from the API. It also opens the calendars of the Leads panel (Reports →
 * Period, the board's Open deal → Expected close, Today's Add task → Due, a mailbox's Warm-up from) and expects each
 * inside the viewport. Cleanup moves the deals back to an open stage and deletes them; the API deletes no company, so
 * every test leaves one `e2e-board-<run>-….test` company until the next `make seed`.
 */

test.use({ viewport: { width: 1440, height: 900 } });

const API = process.env.VUE_APP_API_URL || 'http://localhost:8100';
const CHANNEL = process.env.VUE_APP_LEADS_CHANNEL || 'default-europe';
const LEADS = `${API}/api/leads/v2/admin/${CHANNEL}`;
const COMMUNICATOR = `${API}/api/communicator/v2/admin/${CHANNEL}`;
const RUN = Date.now();
const created = { company: null, deals: [] };

async function authHeaders(page) {
  const cookie = (await page.context().cookies()).find((c) => c.name === 'token');
  return { Authorization: `Bearer ${cookie.value}` };
}

async function api(page, method, url, data) {
  const response = await page.request.fetch(url, { method, headers: await authHeaders(page), data });
  expect(response.ok(), `${method} ${url}: ${response.status()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}

const stageOf = async (page, deal) => (await api(page, 'GET', `${LEADS}/deals/${deal.id}/`)).stage.key;

async function createFixtures(page, index) {
  const tag = `${RUN}-${index}`;
  created.company = await api(page, 'POST', `${LEADS}/companies/`, { domain: `e2e-board-${tag}.test`, name: `E2E board ${tag}` });
  for (const name of ['A', 'B', 'C']) {
    const deal = await api(page, 'POST', `${LEADS}/deals/`, { company_id: created.company.id, title: `E2E ${name} ${RUN}`, owner_id: null });
    created.deals.push(deal);
  }
}

async function cleanup(page) {
  for (const deal of created.deals) {
    const stage = await stageOf(page, deal);
    if (stage !== deal.stage.key) await api(page, 'POST', `${LEADS}/deals/${deal.id}/transition/`, { stage_key: deal.stage.key });
    await api(page, 'DELETE', `${LEADS}/deals/${deal.id}/`);
  }
  created.deals = [];
}

const card = (page, deal) => page.locator(`[data-testid="deal-card"][data-deal="${deal.id}"]`);
const column = (page, key) => page.locator(`[data-testid="deals-column"][data-stage="${key}"]`);

async function openBoard(page) {
  await page.goto('/leads/deals/board?owner=none');
  await expect(page.getByTestId('deals-board-columns')).toBeVisible();
  await expect(card(page, created.deals[0])).toBeVisible();
}

// Press on the card's padding (not its link or menu), travel in steps so the
// fallback drag starts, release over the target column's body.
async function drag(page, deal, stageKey) {
  const from = await card(page, deal).boundingBox();
  // a closing dialog fades out over the board for a moment: press once the card is what the pointer would hit
  const hit = ([x, y, id]) => Boolean(document.elementFromPoint(x, y)?.closest(`[data-deal="${id}"]`));
  await expect.poll(() => page.evaluate(hit, [from.x + 6, from.y + 6, deal.id]), { message: `card ${deal.title} under the pointer` }).toBe(true);
  const to = await column(page, stageKey).locator('.column__body').boundingBox();
  await page.mouse.move(from.x + 6, from.y + 6);
  await page.mouse.down();
  await page.mouse.move(from.x + 20, from.y + 20, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 30, { steps: 20 });
  await page.mouse.move(to.x + to.width / 2, to.y + 34, { steps: 2 });
  await page.mouse.up();
}

async function expectStage(page, deal, stageKey) {
  await expect.poll(() => stageOf(page, deal), { message: `deal ${deal.title} in ${stageKey}` }).toBe(stageKey);
  await expect(column(page, stageKey).locator(`[data-deal="${deal.id}"]`)).toBeVisible();
}

// A calendar opens visible and whole inside the viewport. The test id may sit on the picker's root, which can be wider
// than its trigger: the press goes to the trigger button.
async function expectCalendar(page, picker) {
  const root = picker.locator('xpath=ancestor-or-self::*[contains(@class, "basic-date-picker")][1]');
  await root.locator('.basic-date-picker__trigger').click();
  const calendar = root.locator('.flatpickr-calendar');
  await expect(calendar).toBeVisible();
  const box = await calendar.boundingBox();
  const viewport = page.viewportSize();
  expect(box.width * box.height, 'the calendar is drawn').toBeGreaterThan(0);
  expect(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height, 'inside the viewport').toBe(true);
  await page.keyboard.press('Escape');
}

test.describe('Leads deals board (desktop, real pointer)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await login(page, ...SUPERUSER);
    await createFixtures(page, `${testInfo.workerIndex}-${testInfo.title.length}-${testInfo.retry}`);
  });

  test.afterEach(async ({ page }) => {
    await cleanup(page);
  });

  test('takes a drop every time: next stage, an empty column, Lost with its reason, and after a reload', async ({ page }) => {
    const [first, second, third] = created.deals;
    await openBoard(page);
    const open = (await api(page, 'GET', `${LEADS}/deal-stages/`)).results.filter((stage) => stage.kind === 'open');
    const [start, next, last] = open.map((stage) => stage.key);
    expect(first.stage.key, 'a new deal starts in the first open stage').toBe(start);

    await drag(page, first, next);
    await expectStage(page, first, next);

    const empty = (await page.locator('[data-testid="deals-column"]:has([data-testid="deals-column-empty"])').evaluateAll((els) => els.map((el) => el.dataset.stage)))
      .filter((key) => open.some((stage) => stage.key === key));
    expect(empty.length, 'INFRA: no empty open column on the Unassigned board').toBeGreaterThan(0);
    await drag(page, second, empty[0]);
    await expectStage(page, second, empty[0]);

    const lost = (await api(page, 'GET', `${LEADS}/deal-stages/`)).results.find((stage) => stage.kind === 'lost').key;
    await drag(page, third, lost);
    await expect(page.getByTestId('deal-lost-dialog')).toBeVisible();
    await page.getByTestId('deal-lost-cancel').click();
    await expect(column(page, start).locator(`[data-deal="${third.id}"]`)).toBeVisible();
    expect(await stageOf(page, third)).toBe(start);

    await drag(page, third, lost);
    await page.getByTestId('deal-lost-reason').locator('input').fill('E2E: no budget');
    await page.getByTestId('deal-lost-submit').click();
    await expectStage(page, third, lost);

    await page.reload();
    await expect(card(page, first)).toBeVisible();
    await drag(page, first, last);
    await expectStage(page, first, last);
  });

  test('every calendar of the Leads panel opens inside the viewport', async ({ page }) => {
    await page.goto('/leads/reports');
    await expectCalendar(page, page.getByTestId('reports-period'));

    await openBoard(page);
    await page.getByTestId('deals-open').click();
    await expectCalendar(page, page.getByTestId('deal-expected-close'));
    await page.keyboard.press('Escape');

    await page.goto('/leads/today');
    await page.getByTestId('today-add-task').click();
    await expectCalendar(page, page.getByTestId('task-due-at'));
    await page.keyboard.press('Escape');

    const mailbox = (await api(page, 'GET', `${COMMUNICATOR}/mailboxes/`)).results[0];
    expect(mailbox, 'INFRA: no mailbox (run make seed)').toBeTruthy();
    await page.goto(`/leads/settings/mailboxes/${mailbox.id}`);
    await expectCalendar(page, page.getByTestId('mailbox-warmup-from'));
  });
});
