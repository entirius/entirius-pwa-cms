const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');
const { createErrorCollector } = require('../helpers/error-collector');

/**
 * Outbound roadmap F2/F3 in the CMS: the "starts by itself after the first mail" switch on a sequence card and the
 * "first send moves here" switch on a stage row. Each test flips a switch, reloads to prove the API kept it, and puts
 * the original value back (also when an assertion fails), so the stack ends as it began.
 */

test.use({ viewport: { width: 1280, height: 720 } });

// The usage badge in the shell asks the enrichment module; a stack without it answers 503 on every page.
const ignoreNetwork = ({ status, url }) => status === 503 && url.includes('/api/enrichment/v2/admin/usage/month/');

async function openPage(page, path) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

const checked = async (locator) => (await locator.getByRole('switch').getAttribute('aria-checked')) === 'true';

async function flip(page, locator) {
  const respond = page.waitForResponse((r) => ['PATCH'].includes(r.request().method()) && r.ok());
  await locator.getByRole('switch').click();
  await respond;
}

test.describe('Outbound toggles: sequence autostart and stage on_sent', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('a sequence is switched to autostart, kept after a reload, and switched back', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    await openPage(page, '/leads/settings/sequences');
    const card = page.getByTestId('sequence').filter({ hasText: 'followup' }).first();
    const toggle = card.getByTestId('sequence-autostart');
    await expect(toggle).toBeVisible();
    const before = await checked(toggle);
    try {
      await flip(page, toggle);
      await page.reload();
      await page.waitForLoadState('networkidle');
      const after = page.getByTestId('sequence').filter({ hasText: 'followup' }).first().getByTestId('sequence-autostart');
      expect(await checked(after)).toBe(!before);
    } finally {
      await openPage(page, '/leads/settings/sequences');
      const now = page.getByTestId('sequence').filter({ hasText: 'followup' }).first().getByTestId('sequence-autostart');
      if ((await checked(now)) !== before) await flip(page, now);
    }
    collector.assertNoErrors(expect, 'sequence autostart');
  });

  test('a stage is marked as the first-send target, kept after a reload, and restored', async ({ page }) => {
    const collector = createErrorCollector(page, { ignoreNetwork });
    await openPage(page, '/leads/settings/stages');
    const intel = page.locator('[data-stage="intel"]').getByTestId('stage-on-sent');
    await expect(intel).toBeVisible();
    const before = await checked(intel);
    const contacted = page.locator('[data-stage="contacted"]').getByTestId('stage-on-sent');
    const contactedBefore = await checked(contacted);
    try {
      await flip(page, intel);
      await page.reload();
      await page.waitForLoadState('networkidle');
      expect(await checked(page.locator('[data-stage="intel"]').getByTestId('stage-on-sent'))).toBe(!before);
    } finally {
      await openPage(page, '/leads/settings/stages');
      const now = page.locator('[data-stage="intel"]').getByTestId('stage-on-sent');
      if ((await checked(now)) !== before) await flip(page, now);
      const back = page.locator('[data-stage="contacted"]').getByTestId('stage-on-sent');
      expect(await checked(back)).toBe(contactedBefore);
    }
    collector.assertNoErrors(expect, 'stage on_sent');
  });

  for (const [name, width, height] of [['phone', 375, 800], ['tablet', 768, 1000]]) {
    test(`both switches fit a ${name} (${width}px) without sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      for (const [path, switchId] of [['sequences', 'sequence-autostart'], ['stages', 'stage-on-sent']]) {
        await openPage(page, `/leads/settings/${path}`);
        const toggle = page.getByTestId(switchId).first();
        await expect(toggle).toBeVisible();
        const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        expect(scroll, `${path} overflows at ${width}px`).toBeLessThanOrEqual(inner);
        const box = await toggle.boundingBox();
        expect(box.x + box.width, `${switchId} leaves the screen at ${width}px`).toBeLessThanOrEqual(width);
      }
    });
  }
});
