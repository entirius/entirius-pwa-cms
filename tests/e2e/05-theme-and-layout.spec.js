const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');

/**
 * Theme & Layout Tests
 *
 * Covers theme toggle, sidebar behavior, panel switching,
 * notifications, and loading overlay. All tests verify
 * user-visible UI outcomes.
 */

test.describe('Theme', () => {

  test('toggle switches between dark and light', async ({ page }) => {
    await login(page);
    await page.goto('/pages/content?lg=pl');
    await page.waitForLoadState('networkidle');

    const initialTheme = await page.getAttribute('html', 'data-theme');

    // Theme toggle is the second .hc-btn in HeaderControls
    const themeBtn = page.locator('.hc-btn').nth(1);
    await expect(themeBtn).toBeVisible({ timeout: 5000 });
    await themeBtn.click();

    const newTheme = await page.getAttribute('html', 'data-theme');
    expect(newTheme).not.toEqual(initialTheme);

    // Toggle back to restore original
    await themeBtn.click();
    const restoredTheme = await page.getAttribute('html', 'data-theme');
    expect(restoredTheme).toEqual(initialTheme);
  });

  test('persists after page reload', async ({ page }) => {
    await login(page);
    await page.goto('/pages/content?lg=pl');
    await page.waitForLoadState('networkidle');

    const initialTheme = await page.getAttribute('html', 'data-theme');

    // Toggle theme
    const themeBtn = page.locator('.hc-btn').nth(1);
    await themeBtn.click();
    const toggledTheme = await page.getAttribute('html', 'data-theme');
    expect(toggledTheme).not.toEqual(initialTheme);

    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    const persistedTheme = await page.getAttribute('html', 'data-theme');
    expect(persistedTheme).toEqual(toggledTheme);

    // Restore original theme
    const themeBtn2 = page.locator('.hc-btn').nth(1);
    await themeBtn2.click();
  });

});

test.describe('Sidebar', () => {

  test('collapses and expands', async ({ page }) => {
    await login(page);
    await page.goto('/pages/content?lg=pl');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('.layout .app-sidebar-col');
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    const toggleBtn = page.locator('.sidebar-edge-toggle');
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });

    const wasCollapsed = await sidebar.evaluate(
      el => el.classList.contains('sidebar-collapsed')
    );

    // First click
    await toggleBtn.click();
    await page.waitForTimeout(400);
    const afterFirst = await sidebar.evaluate(
      el => el.classList.contains('sidebar-collapsed')
    );
    expect(afterFirst).not.toEqual(wasCollapsed);

    // Second click restores
    await toggleBtn.click();
    await page.waitForTimeout(400);
    const afterSecond = await sidebar.evaluate(
      el => el.classList.contains('sidebar-collapsed')
    );
    expect(afterSecond).toEqual(wasCollapsed);
  });

  test('hides nav labels when collapsed', async ({ page }) => {
    await login(page);
    await page.goto('/pages/content?lg=pl');
    await page.waitForLoadState('networkidle');

    const navLabel = page.locator('.nav-label').first();
    await expect(navLabel).toBeVisible({ timeout: 5000 });

    // Collapse
    const toggleBtn = page.locator('.sidebar-edge-toggle');
    await toggleBtn.click();
    await page.waitForTimeout(400);
    await expect(navLabel).toBeHidden();

    // Expand to restore
    await toggleBtn.click();
    await page.waitForTimeout(400);
    await expect(navLabel).toBeVisible();
  });

});

test.describe('Panel Switching', () => {

  test('header dropdown navigates to PIM panel', async ({ page }) => {
    await login(page);
    await page.goto('/pages/content?lg=pl');
    await page.waitForLoadState('networkidle');

    // Open panel switcher (first .hc-btn is the grip icon)
    const panelSwitcherBtn = page.locator('.hc-btn').first();
    await panelSwitcherBtn.click();

    const dropdown = page.locator('.hc-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Click PIM item
    const pimItem = dropdown.locator('.hc-dropdown-item:has-text("PIM")');
    await expect(pimItem).toBeVisible();
    await pimItem.click();

    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/pim');
  });

  test('home cards navigate to correct panel', async ({ page }) => {
    await login(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const panelCards = page.locator('.panel-card');
    await expect(panelCards.first()).toBeVisible({ timeout: 5000 });

    // Click first card (Pages panel)
    await panelCards.first().click();
    await page.waitForLoadState('networkidle');

    // Should be on a pages route with sidebar visible
    expect(page.url()).toContain('/pages/');
    const sidebar = page.locator('.layout .app-sidebar-col');
    await expect(sidebar).toBeVisible({ timeout: 5000 });
  });

  test('home page has no sidebar', async ({ page }) => {
    await login(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // No sidebar on home
    const layoutSidebar = page.locator('.layout .app-sidebar-col');
    await expect(layoutSidebar).toHaveCount(0);

    // Header still visible
    const header = page.locator('.app-header');
    await expect(header).toBeVisible();
  });

});

test.describe('Notifications', () => {

  test('notification container is rendered in DOM', async ({ page }) => {
    await login(page);
    await page.goto('/pages/content?lg=pl');
    await page.waitForLoadState('networkidle');

    // The .notifications container is always in DOM (rendered in App.vue)
    const container = page.locator('.notifications');
    await expect(container).toBeAttached();
  });

});

test.describe('Loading Overlay', () => {

  test('loader is not stuck after page load', async ({ page }) => {
    await login(page);
    await page.goto('/pages/content?lg=pl');
    await page.waitForLoadState('networkidle');

    // After full load, the loading overlay should not be visible
    const loader = page.locator('.loading');
    const isVisible = await loader.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });

});
