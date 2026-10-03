const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { createErrorCollector } = require('../helpers/error-collector');

/**
 * Access plan 23: a token's value never leaves the SecretReveal dialog. The admin creates a run-unique application and
 * a token with one secret scope; the value is read from the dialog's field into a local variable only, the dialog is
 * confirmed and closed; then the value must be in no console message, web storage entry, cookie, visited URL, the page
 * HTML, or any API response after the create (the token list and the application detail, reloaded). Cleanup revokes
 * the token and deactivates the application. The value is never printed: every assertion is a yes/no named by the
 * token id, and trace, screenshot and video are off (they would keep the field's content on disk).
 * The one access spec that writes.
 */

const API = process.env.VUE_APP_API_URL || 'http://localhost:8100';
const ADMIN = `${API}/api/access/v2/admin`;
// A server-to-server scope with the least reach (review moderation); a secret scope gets the 365-day expiry default.
const SECRET_SCOPE = 'reviews.moderate';
const TOKEN_CREATE = /\/api\/access\/v2\/admin\/applications\/\d+\/tokens\/$/;

const created = { applicationId: null, tokenId: null };

// Top level: a trace, screenshot or video would keep the dialog's field on disk.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

async function bearer(page) {
  const cookie = (await page.context().cookies()).find((c) => c.name === 'token');
  return { Authorization: `Bearer ${cookie.value}` };
}

// Every console message and URL the page visits from now on; API response bodies once `bodies` is switched on.
function recordTraces(page) {
  const traces = { console: [], urls: [page.url()], bodies: [], recordBodies: false };
  page.on('console', (msg) => traces.console.push(msg.text()));
  page.on('framenavigated', (frame) => frame === page.mainFrame() && traces.urls.push(frame.url()));
  page.on('response', (response) => {
    if (traces.recordBodies && response.url().startsWith(API)) traces.bodies.push(response.text().catch(() => ''));
  });
  return traces;
}

async function webStorage(page) {
  return page.evaluate(() =>
    [localStorage, sessionStorage].flatMap((store) => Object.keys(store).map((key) => `${key}=${store.getItem(key)}`))
  );
}

// BasicCheckbox: the test id lands on its label (attribute fallthrough) or on the native input inside it.
const checkbox = (page, testid) => page.locator(`label[data-testid="${testid}"], label:has([data-testid="${testid}"])`);

async function createApplication(page, name) {
  await page.goto('/access/applications/new');
  await page.waitForLoadState('networkidle');
  await page.locator('[data-testid="application-name"] input').fill(name);
  await page.locator('[data-testid="application-save"]').click();
  await page.waitForURL(/\/access\/applications\/\d+$/);
  await page.waitForLoadState('networkidle');
  created.applicationId = Number(page.url().match(/(\d+)$/)[1]);
}

async function createToken(page, name) {
  await page.locator('[data-testid="token-create"]').click();
  await page.locator('[data-testid="token-name"] input').fill(name);
  await checkbox(page, `token-scope-${SECRET_SCOPE}`).click();
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && TOKEN_CREATE.test(r.url())),
    page.locator('[data-testid="token-create-save"]').click(),
  ]);
  expect(response.status(), 'token create').toBe(201);
  created.tokenId = (await response.json()).id;
}

// Reads the shown-once value into a local variable, confirms it was stored and closes the dialog.
async function takeSecret(page) {
  const field = page.locator('[data-testid="secret-reveal-value"]');
  await expect(field).toBeVisible();
  const secret = await field.inputValue();
  await checkbox(page, 'secret-reveal-stored').click();
  await page.locator('[data-testid="secret-reveal-close"]').click();
  await expect(page.locator('[data-testid="secret-reveal"]')).toHaveCount(0);
  return secret;
}

test.describe('Access: a token value stays in SecretReveal (desktop)', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.afterEach(async ({ page }) => {
    const headers = await bearer(page);
    if (created.tokenId) await page.request.post(`${ADMIN}/tokens/${created.tokenId}/revoke/`, { headers });
    if (created.applicationId) {
      await page.request.patch(`${ADMIN}/applications/${created.applicationId}/`, { headers, data: { is_active: false } });
    }
  });

  test('the value is shown once and found nowhere after close', async ({ page }) => {
    await login(page);
    const collector = createErrorCollector(page);
    const traces = recordTraces(page);
    const run = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    await createApplication(page, `e2e-secret-${run}`);
    await createToken(page, `e2e secret ${run}`);

    const secret = await takeSecret(page);
    const id = `token ${created.tokenId}`;
    expect(secret.startsWith('ent_api_') && secret.length > 20, `${id}: the dialog showed a token value`).toBe(true);

    // Every API answer after the create: the reloaded application detail and token list.
    traces.recordBodies = true;
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`[data-testid="token-row-${created.tokenId}"]`)).toBeVisible();

    const holds = (text) => String(text).includes(secret);
    expect(traces.console.some(holds), `${id} in a console message`).toBe(false);
    expect((await webStorage(page)).some(holds), `${id} in web storage`).toBe(false);
    expect((await page.context().cookies()).some((c) => holds(c.value)), `${id} in a cookie`).toBe(false);
    expect([...traces.urls, page.url()].some(holds), `${id} in a visited URL`).toBe(false);
    expect(holds(await page.content()), `${id} in the page HTML`).toBe(false);
    const bodies = await Promise.all(traces.bodies);
    expect(bodies.length, 'API responses after the reload').toBeGreaterThan(0);
    expect(bodies.some(holds), `${id} in a later API response`).toBe(false);

    collector.assertNoErrors(expect, 'Access secret');
  });
});
