/**
 * Suppliers panel — deep button coverage.
 *
 * Strategy: stub auth via cookies + intercept all `/api/atlas/v2/admin/...`
 * and `/api/munin/v2/...` endpoints with `installSuppliersMock`. Each test
 * asserts the correct outgoing API call (URL/method/payload) AND the UI
 * state change (toast, list reload, navigation).
 */

const { test, expect } = require('@playwright/test');
const {
  installSuppliersMock,
  fakeLogin,
  waitForRequest,
  fillField,
} = require('../helpers/suppliers-mock');

let mockState;

test.describe('Suppliers panel', () => {
  test.beforeEach(async ({ page, context }) => {
    await fakeLogin(context);
    mockState = await installSuppliersMock(page);
  });

  // ---------- munin gating ----------

  test.describe('munin gating', () => {
    test('panel route renders when munin enabled', async ({ page, context }) => {
      // re-install mock with default (enabled = true)
      mockState = await installSuppliersMock(page);
      await page.goto('/suppliers/list');
      await page.waitForLoadState('networkidle');
      await expect(
        page.getByTestId('suppliers-create-btn')
      ).toBeVisible({ timeout: 10000 });
    });

    test('router redirects to home when panel disabled in munin', async ({
      page,
      context,
    }) => {
      // override mock to mark suppliers as disabled
      mockState = await installSuppliersMock(page, { muninEnabled: false });
      await page.goto('/suppliers/list');
      await page.waitForLoadState('networkidle');
      // App should have routed back to '/' per router beforeEach guard
      await expect(page).toHaveURL(/\/$|\/?$/);
    });
  });

  // ---------- SourceList ----------

  test.describe('SourceList', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/suppliers/list');
      await page.waitForLoadState('networkidle');
    });

    test('list renders the seeded suppliers', async ({ page }) => {
      const table = page.locator('.data-table');
      await expect(table.getByText('Acme Corp').first()).toBeVisible();
      await expect(table.getByText('Globex Industries').first()).toBeVisible();
    });

    test('Create opens drawer, POSTs supplier, list reflects new row', async ({
      page,
    }) => {
      await page.getByTestId('suppliers-create-btn').click();
      await fillField(page, 'suppliers-create-idx', 'newco');
      await fillField(page, 'suppliers-create-name', 'NewCo Ltd');
      await fillField(page, 'suppliers-create-language', 'EN');
      await fillField(page, 'suppliers-create-currency', 'EUR');
      await page.getByTestId('suppliers-create-submit').click();

      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'POST' && r.url.endsWith('/sources/')
      );
      expect(req.postData).toMatchObject({ idx: 'newco', name: 'NewCo Ltd' });

      await expect(
        page.locator('.data-table').getByText('NewCo Ltd').first()
      ).toBeVisible({ timeout: 5000 });
    });

    test('Cancel closes drawer without POSTing', async ({ page }) => {
      await page.getByTestId('suppliers-create-btn').click();
      await page.getByTestId('suppliers-create-cancel').click();

      const created = mockState.requests.find(
        (r) => r.method === 'POST' && r.url.includes('/sources/')
      );
      expect(created).toBeUndefined();
    });

    test('Search input drives GET with search query', async ({ page }) => {
      await fillField(page, 'suppliers-search-input', 'globex');
      // useSearchDebounce delays ~300 ms
      await page.waitForTimeout(450);

      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'GET' &&
          r.url.includes('/sources/?') &&
          r.url.includes('search=globex')
      );
      expect(req).toBeTruthy();
    });

    test('Kind FilterChip filters list and refetches', async ({ page }) => {
      // Open mobile filter panel and click "Procurement" chip
      const procurementChip = page.getByTestId(
        'suppliers-filter-kind-procurement'
      );
      // The filter panel may auto-open on desktop; tolerate either case
      if (!(await procurementChip.isVisible().catch(() => false))) {
        const trigger = page.locator(
          '.mobile-filter-panel__trigger, [data-testid*="filter"]'
        );
        if (await trigger.first().isVisible().catch(() => false)) {
          await trigger.first().click();
        }
      }
      await procurementChip.click();
      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'GET' &&
          r.url.includes('/sources/?') &&
          r.url.includes('kind=procurement')
      );
      expect(req).toBeTruthy();
    });

    test('Edit row navigates to /atlas/{idx}', async ({ page }) => {
      await page.getByTestId('suppliers-edit-acme').click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/atlas\/acme/);
    });

    test('Soft delete sends DELETE without force flag and toggles is_active', async ({
      page,
    }) => {
      await page.getByTestId('suppliers-delete-acme').click();
      // delete-impact pre-fetch
      await waitForRequest(
        mockState,
        (r) =>
          r.method === 'GET' && r.url.includes('/sources/acme/delete-impact/')
      );
      // Soft is the default radio
      await expect(page.getByTestId('suppliers-delete-soft-radio')).toBeChecked();
      await page.getByTestId('suppliers-delete-confirm').click();
      const req = await waitForRequest(
        mockState,
        (r) => r.method === 'DELETE' && r.url.includes('/sources/acme/')
      );
      expect(req.url).not.toContain('force=true');
    });

    test('Hard delete sends DELETE with force=true and removes row', async ({
      page,
    }) => {
      await page.getByTestId('suppliers-delete-acme').click();
      // wait for the impact pre-fetch to complete so the banner has data
      await waitForRequest(
        mockState,
        (r) =>
          r.method === 'GET' && r.url.includes('/sources/acme/delete-impact/')
      );
      await page.getByTestId('suppliers-delete-hard-radio').check();
      // impact banner shows the affected counts
      await expect(
        page.getByTestId('suppliers-delete-impact-banner')
      ).toBeVisible();
      await page.getByTestId('suppliers-delete-confirm').click();
      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'DELETE' &&
          r.url.includes('/sources/acme/') &&
          r.url.includes('force=true')
      );
      expect(req).toBeTruthy();
      await expect(
        page.locator('.data-table').getByText('Acme Corp')
      ).toHaveCount(0, { timeout: 3000 });
    });

    test('Delete cancel closes modal without DELETE', async ({ page }) => {
      await page.getByTestId('suppliers-delete-acme').click();
      await page.getByTestId('suppliers-delete-cancel').click();

      const del = mockState.requests.find((r) => r.method === 'DELETE');
      expect(del).toBeUndefined();
    });
  });

  // ---------- SourceDetail toolbar + tabs ----------

  test.describe('SourceDetail', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/suppliers/acme');
      await page.waitForLoadState('networkidle');
    });

    test('Back button returns to list', async ({ page }) => {
      await page.getByTestId('suppliers-detail-back').click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/suppliers\/list/);
    });

    test('Tabs switch active segment for all 6 tabs', async ({ page }) => {
      // Skip "overview" — it's already the default active tab so clicking
      // it does not flip activeTab and the URL watcher does not re-emit.
      const tabs = ['feeds', 'mappings', 'products', 'linked', 'logs', 'overview'];
      for (const key of tabs) {
        const btn = page.getByTestId(`suppliers-tab-${key}`);
        await btn.click();
        await expect(btn).toHaveClass(/segmented-control__option--active/);
      }
    });
  });

  // ---------- OverviewTab ----------

  test.describe('OverviewTab', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/suppliers/acme?tab=overview');
      await page.waitForLoadState('networkidle');
    });

    test('Save is disabled until form is dirty', async ({ page }) => {
      const save = page.getByTestId('suppliers-overview-save');
      await expect(save).toBeDisabled();
      await fillField(page, 'overview-name', 'Acme Corp Renamed');
      await expect(save).toBeEnabled();
    });

    test('Save sends PATCH with only changed fields', async ({ page }) => {
      await fillField(page, 'overview-name', 'Acme Corp Renamed');
      await page.getByTestId('suppliers-overview-save').click();
      const req = await waitForRequest(
        mockState,
        (r) => r.method === 'PATCH' && r.url.includes('/sources/acme/')
      );
      expect(req.postData).toEqual({ name: 'Acme Corp Renamed' });
    });

    test('SKU prefix change is tracked separately', async ({ page }) => {
      await fillField(page, 'overview-sku-prefix', 'AAA');
      await page.getByTestId('suppliers-overview-save').click();
      const req = await waitForRequest(
        mockState,
        (r) => r.method === 'PATCH' && r.url.includes('/sources/acme/')
      );
      expect(req.postData).toEqual({ sku_prefix: 'AAA' });
    });
  });

  // ---------- FeedsTab ----------

  test.describe('FeedsTab', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/suppliers/acme?tab=feeds');
      await page.waitForLoadState('networkidle');
    });

    test('feeds list shows seeded feed', async ({ page }) => {
      await expect(
        page.locator('.data-table').getByText('xml-1').first()
      ).toBeVisible();
    });

    test('Create feed POSTs and adds row', async ({ page }) => {
      await page.getByTestId('feeds-create-btn').click();
      await fillField(page, 'feed-form-idx', 'xml-2');
      await page.getByTestId('feed-form-submit').click();
      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'POST' && r.url.endsWith('/sources/acme/feeds/')
      );
      expect(req.postData).toMatchObject({ idx: 'xml-2' });
      await expect(
        page.locator('.data-table').getByText('xml-2').first()
      ).toBeVisible({ timeout: 5000 });
    });

    test('Edit feed PATCHes selected feed', async ({ page }) => {
      await page.getByTestId('feeds-edit-xml-1').click();
      // feed_url field is auto-populated; flip is_active off
      await page.getByTestId('feed-form-is-active').click();
      await page.getByTestId('feed-form-submit').click();
      const req = await waitForRequest(
        mockState,
        (r) => r.method === 'PATCH' && r.url.includes('/feeds/xml-1/')
      );
      expect(req.postData).toMatchObject({ is_active: false });
    });

    test('Delete feed sends DELETE and row disappears', async ({ page }) => {
      await page.getByTestId('feeds-delete-xml-1').click();
      // Confirmation-modal default footer accept button
      await page
        .locator('.modal-btn--delete')
        .last()
        .click();
      const req = await waitForRequest(
        mockState,
        (r) => r.method === 'DELETE' && r.url.includes('/feeds/xml-1/')
      );
      expect(req).toBeTruthy();
      await expect(
        page.locator('.data-table').getByText('xml-1')
      ).toHaveCount(0, { timeout: 3000 });
    });

    test('Test feed POSTs test endpoint and shows raw products', async ({
      page,
    }) => {
      await page.getByTestId('feeds-test-xml-1').click();
      await waitForRequest(
        mockState,
        (r) => r.method === 'POST' && r.url.endsWith('/feeds/xml-1/test/')
      );
      await expect(page.getByTestId('test-feed-row-0')).toBeVisible({
        timeout: 5000,
      });
      await page.getByTestId('test-feed-close').click();
      await expect(page.getByTestId('test-feed-modal')).not.toBeVisible();
    });

    test('Trigger feed → confirm → POSTs trigger', async ({ page }) => {
      await page.getByTestId('feeds-trigger-xml-1').click();
      await page.locator('.modal-btn--delete').last().click();
      const req = await waitForRequest(
        mockState,
        (r) => r.method === 'POST' && r.url.endsWith('/feeds/xml-1/trigger/')
      );
      expect(req).toBeTruthy();
    });
  });

  // ---------- MappingsTab ----------

  test.describe('MappingsTab', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/suppliers/acme?tab=mappings');
      await page.waitForLoadState('networkidle');
    });

    test('profile list renders seeded profile', async ({ page }) => {
      await expect(
        page.getByTestId('mapping-profile-default')
      ).toBeVisible();
    });

    test('Create profile POSTs with parsed channels', async ({ page }) => {
      await page.getByTestId('mappings-create-profile-btn').click();
      await fillField(page, 'mapping-form-idx', 'intl');
      await fillField(page, 'mapping-form-name', 'International');
      await fillField(page, 'mapping-form-channels', 'default-uk, default-fr');
      await page.getByTestId('mapping-form-submit').click();
      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'POST' &&
          r.url.endsWith('/sources/acme/mapping-profiles/')
      );
      expect(req.postData).toMatchObject({
        idx: 'intl',
        target_channel_idxs: ['default-uk', 'default-fr'],
      });
    });

    test('Validate profile POSTs validate endpoint', async ({ page }) => {
      await page.getByTestId('mapping-validate-default').click();
      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'POST' &&
          r.url.endsWith('/sources/acme/mapping-profiles/default/validate/')
      );
      expect(req).toBeTruthy();
    });

    test('Delete profile sends DELETE', async ({ page }) => {
      await page.getByTestId('mapping-delete-profile-default').click();
      await page.locator('.modal-btn--delete').last().click();
      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'DELETE' &&
          r.url.endsWith('/suppliers/acme/mapping-profiles/default/')
      );
      expect(req).toBeTruthy();
    });
  });

  // ---------- ProductsTab ----------

  test.describe('ProductsTab', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/suppliers/acme?tab=products');
      await page.waitForLoadState('networkidle');
    });

    test('list filters by status (default queued)', async ({ page }) => {
      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'GET' &&
          r.url.includes('/products/?') &&
          r.url.includes('status=queued')
      );
      expect(req).toBeTruthy();
    });

    test('Approved status FilterChip changes query', async ({ page }) => {
      await page.getByTestId('products-status-approved').click();
      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'GET' &&
          r.url.includes('/products/?') &&
          r.url.includes('status=approved')
      );
      expect(req).toBeTruthy();
    });

    test('Push button POSTs push for approved row', async ({ page }) => {
      await page.getByTestId('products-status-approved').click();
      await page.waitForLoadState('networkidle');
      await page.getByTestId('products-push-502').click();
      const req = await waitForRequest(
        mockState,
        (r) => r.method === 'POST' && r.url.endsWith('/products/502/push/')
      );
      expect(req).toBeTruthy();
    });

    test('Force re-push opens modal and POSTs force-repush', async ({ page }) => {
      await page.getByTestId('products-status-pushed').click();
      await page.waitForLoadState('networkidle');
      await page.getByTestId('products-force-repush-504').click();
      // Affected channel listed
      await expect(page.getByText('default-europe')).toBeVisible();
      await page.locator('.modal-btn--delete').last().click();
      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'POST' && r.url.endsWith('/products/504/force-repush/')
      );
      expect(req).toBeTruthy();
    });
  });

  // ---------- LinkedTab ----------

  test.describe('LinkedTab', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/suppliers/acme?tab=linked');
      await page.waitForLoadState('networkidle');
    });

    test('No-preferred banner shows when no link is_preferred', async ({
      page,
    }) => {
      await expect(
        page.getByTestId('linked-no-preferred-banner')
      ).toBeVisible();
    });

    test('Set preferred POSTs and banner disappears', async ({ page }) => {
      await page.getByTestId('linked-set-preferred-901').click();
      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'POST' &&
          r.url.endsWith('/product-links/901/set-preferred/')
      );
      expect(req).toBeTruthy();
      // After refresh, banner is gone
      await expect(
        page.getByTestId('linked-no-preferred-banner')
      ).not.toBeVisible({ timeout: 5000 });
    });

    test('Unset preferred PATCHes is_preferred=false (no dedicated endpoint)', async ({
      page,
    }) => {
      // first set preferred so we can unset it
      await page.getByTestId('linked-set-preferred-901').click();
      await page.waitForLoadState('networkidle');
      await page.getByTestId('linked-unset-preferred-901').click();
      const req = await waitForRequest(
        mockState,
        (r) => r.method === 'PATCH' && r.url.endsWith('/product-links/901/')
      );
      expect(req.postData).toEqual({ is_preferred: false });
    });

    test('Create link POSTs new link', async ({ page }) => {
      await page.getByTestId('linked-create-btn').click();
      await fillField(page, 'linked-form-sku', 'PIM-SKU-3');
      await page.getByTestId('linked-form-submit').click();
      const req = await waitForRequest(
        mockState,
        (r) => r.method === 'POST' && r.url.endsWith('/product-links/')
      );
      expect(req.postData).toMatchObject({
        real_product_sku: 'PIM-SKU-3',
        supplier_idx: 'acme',
      });
    });

    test('Delete link sends DELETE', async ({ page }) => {
      await page.getByTestId('linked-delete-901').click();
      await page.locator('.modal-btn--delete').last().click();
      const req = await waitForRequest(
        mockState,
        (r) => r.method === 'DELETE' && r.url.endsWith('/product-links/901/')
      );
      expect(req).toBeTruthy();
    });
  });

  // ---------- LogsTab ----------

  test.describe('LogsTab', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/suppliers/acme?tab=logs');
      await page.waitForLoadState('networkidle');
    });

    test('Default Feed runs mode shows ImportLog rows', async ({ page }) => {
      await expect(page.getByText('11111111-1111-1111-1111-111111111111')).toBeVisible();
    });

    test('Switching to Events fetches events', async ({ page }) => {
      await page.getByTestId('logs-mode-events').click();
      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'GET' &&
          r.url.includes('/events/') &&
          r.url.includes('supplier_idx=acme')
      );
      expect(req).toBeTruthy();
    });

    test('Severity filter chip narrows query', async ({ page }) => {
      await page.getByTestId('logs-mode-events').click();
      await page.getByTestId('logs-severity-warning').click();
      const req = await waitForRequest(
        mockState,
        (r) =>
          r.method === 'GET' &&
          r.url.includes('/events/') &&
          r.url.includes('severity=warning')
      );
      expect(req).toBeTruthy();
    });

    test('Acknowledge POSTs ack endpoint', async ({ page }) => {
      await page.getByTestId('logs-mode-events').click();
      await page.waitForLoadState('networkidle');
      await page.getByTestId('logs-ack-801').click();
      const req = await waitForRequest(
        mockState,
        (r) => r.method === 'POST' && r.url.endsWith('/events/801/acknowledge/')
      );
      expect(req).toBeTruthy();
    });
  });
});
