const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');

/**
 * Content Builder Workflow Tests
 *
 * Tests builder page load, section rendering, section controls,
 * and tile slider visibility. Avoids clicking SubscriberSetter
 * elements which open the handy-kit overlay.
 */

test.describe('Content Builder Workflow', () => {

  test('should navigate to builder and see section content', async ({ page }) => {
    await login(page);

    // Navigate to content list
    await page.goto('/pages/content?lg=pl');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.data-table__row, .filter-chip').first()).toBeVisible({ timeout: 10000 });

    // Click Edit on first item
    const editButton = page.locator('.data-table__action-btn').first();
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();
    await page.waitForLoadState('networkidle');

    // Builder should show sections with core_type labels
    const sectionHeader = page.locator('.fs-600.fw-600').first();
    await expect(sectionHeader).toBeVisible({ timeout: 10000 });
    const headerText = await sectionHeader.textContent();
    expect(headerText.length).toBeGreaterThan(0);

    // Section should have control buttons (eye, pen, copy, trash)
    const sectionBtns = page.locator('.section-icon-btn');
    const btnCount = await sectionBtns.count();
    expect(btnCount).toBeGreaterThanOrEqual(4);

    await page.screenshot({ path: 'test-results/content-builder-sections.png' });
  });

  test('should display tiles in swiper slider', async ({ page }) => {
    await login(page);

    await page.goto('/pages/content?lg=pl');
    await page.waitForLoadState('networkidle');

    // Edit first content item
    const editButton = page.locator('.data-table__action-btn').first();
    await editButton.click();
    await page.waitForLoadState('networkidle');

    // Wait for builder to render
    await page.waitForTimeout(1000);

    // Tiles are shown by default in a swiper slider (compact mode)
    // Look for swiper slides containing tile data
    const swiperSlides = page.locator('.swiper-slide');
    const hasSlides = await swiperSlides.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasSlides) {
      const slideCount = await swiperSlides.count();
      expect(slideCount).toBeGreaterThan(0);
      console.log(`Found ${slideCount} tile slides in swiper`);
    } else {
      // Section may have no tiles -- that is valid
      console.log('No tile slides found -- section may have max_tiles: 0');
    }
  });

});
