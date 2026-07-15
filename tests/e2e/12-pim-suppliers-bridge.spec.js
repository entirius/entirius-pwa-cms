const { test, expect } = require("@playwright/test");
const { login } = require("../helpers/auth");
const { createErrorCollector } = require("../helpers/error-collector");

/**
 * etap-06 — PIM Panel Bridge (badge in list view, Supplier tab in detail).
 *
 * Verifies that:
 * - PIM Products list renders without console errors when bulk has-changes
 *   call returns data (or empty map).
 * - Direct anchor navigation `#supplier` is handled gracefully (no JS errors)
 *   even when no supplier is linked — the tab is conditional.
 *
 * Live data flow (badge visible + Acknowledge round-trip) is exercised by the
 * /browser skill scenario logged in the etap-06 file because it requires
 * pre-seeded ProductSupplierLink + change log rows.
 */

test.describe("etap-06 PIM bridge — smoke", () => {
  test("PIM Products list renders without errors with suppliers panel enabled", async ({ page }) => {
    await login(page);
    const collector = createErrorCollector(page);

    await page.goto("/pim/products");
    await page.waitForLoadState("networkidle");

    // No password field — confirms login worked
    const onLogin = await page
      .locator('input[type="password"]')
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    expect(onLogin).toBeFalsy();

    // DataTable should still render (badge column only when suppliers panel enabled;
    // if disabled, list still works)
    const tableVisible = await page
      .locator(".data-table__header-cell, .data-table")
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    expect(tableVisible).toBeTruthy();

    collector.assertNoErrors(expect, "etap-06 PIM list with suppliers panel");
  });

  test("anchor #supplier on detail view does not crash when no supplier linked", async ({ page }) => {
    await login(page);
    const collector = createErrorCollector(page);

    // Pick any seeded SKU. ENT-S001 is the standard test catalog entry.
    await page.goto("/pim/products/ENT-S001#supplier");
    await page.waitForLoadState("networkidle");

    // Page should not throw — basic detail layout renders even if Supplier tab
    // hidden because product has no linked supplier.
    const onLogin = await page
      .locator('input[type="password"]')
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    expect(onLogin).toBeFalsy();

    const bodyText = await page.textContent("body").catch(() => "");
    expect(bodyText.length).toBeGreaterThan(100);

    collector.assertNoErrors(expect, "etap-06 detail #supplier anchor");
  });
});
