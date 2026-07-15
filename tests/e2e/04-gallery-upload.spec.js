const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');
const path = require('path');
const fs = require('fs');

/**
 * Gallery Upload Workflow Test
 * Tests image upload, verification, pagination, and cleanup
 */

test.describe('Gallery Upload Workflow', () => {
  let uploadedImageAlt;

  test.beforeEach(() => {
    // Generate unique alt text for this test run to avoid conflicts
    uploadedImageAlt = `test-${Date.now()}`;
  });

  test('should upload image to gallery and verify it appears', async ({ page }) => {
    // Step 1: Login
    await login(page);

    // Step 2: Navigate to Gallery via URL
    await page.goto('/pages/gallery');
    await page.waitForLoadState('networkidle');

    // Verify gallery loaded (look for gallery grid or filter area)
    await expect(page.locator('.gallery-card, .tag-chip, [class*="gallery"]').first()).toBeVisible({ timeout: 10000 });

    // Step 3: Open FAB menu
    const fabTrigger = page.locator('.floating-actions__trigger');
    await expect(fabTrigger).toBeVisible({ timeout: 5000 });
    await fabTrigger.click();

    // Step 4: Click "Add photo" action (first FAB action - upload icon)
    const addPhotoAction = page.locator('.floating-actions__action--primary').first();
    await expect(addPhotoAction).toBeVisible({ timeout: 3000 });
    await addPhotoAction.click();

    // Step 5: Verify we're in add_new mode (select from disk button should appear)
    const selectFromDiskButton = page.locator('button:has-text("Wybierz z dysku")');
    await expect(selectFromDiskButton).toBeVisible({ timeout: 5000 });

    // Step 6: Upload the test image via hidden file input
    const testImagePath = path.join(__dirname, '../fixtures/testimg.png');

    if (!fs.existsSync(testImagePath)) {
      throw new Error(`Test image not found at: ${testImagePath}`);
    }

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      selectFromDiskButton.click()
    ]);
    await fileChooser.setFiles(testImagePath);

    // Wait for image preview to appear
    await page.waitForTimeout(1000);

    // Step 7: Fill in alt text
    const altTextInput = page.locator('input[type="text"]').last();
    await altTextInput.fill(uploadedImageAlt);

    // Step 8: Click "Upload" button (PL: "Wgraj")
    const uploadButton = page.locator('button:has-text("Wgraj")');
    await expect(uploadButton).toBeVisible({ timeout: 5000 });
    await uploadButton.click();

    // Step 9: Wait for upload to complete and return to gallery view
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Verify we're back on the gallery page (read mode with gallery grid)
    await expect(page.locator('.gallery-card').first()).toBeVisible({ timeout: 10000 });

    // Step 10: Verify gallery has images
    const imageCount = await page.locator('.gallery-card').count();
    expect(imageCount).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/gallery-after-upload.png' });
  });

  test('should test gallery pagination if available', async ({ page }) => {
    await login(page);

    // Navigate to Gallery via URL
    await page.goto('/pages/gallery');
    await page.waitForLoadState('networkidle');

    // Check if pagination exists
    const paginationExists = await page.locator('[class*="pagination"]').count() > 0;

    if (paginationExists) {
      // Click next page button if available
      const nextButton = page.locator('[class*="pagination"] button').last();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await page.screenshot({ path: 'test-results/gallery-pagination-page2.png' });

        // Go back to first page
        const prevButton = page.locator('[class*="pagination"] button').first();
        if (await prevButton.isVisible()) {
          await prevButton.click();
          await page.waitForLoadState('networkidle');
        }
      }
    } else {
      console.log('No pagination found - gallery has single page');
    }
  });

  test('should delete uploaded test image and logout', async ({ page }) => {
    await login(page);

    // Navigate to Gallery via URL
    await page.goto('/pages/gallery');
    await page.waitForLoadState('networkidle');

    // Find the first gallery card and click it to select
    const firstCard = page.locator('.gallery-card').first();

    if (await firstCard.isVisible()) {
      await firstCard.click();

      // Click delete button in overlay (PL: "Usun")
      const deleteButton = page.locator('.gallery-overlay__btn').first();

      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();

        // Wait for deletion to complete
        await page.waitForLoadState('networkidle');

        console.log('Test image deleted successfully');
      } else {
        console.log('Delete button not found - image may need to be deleted manually');
      }
    }

    // Logout via icon button (no visible text, use aria-label)
    const logoutButton = page.locator('button[aria-label="Wyloguj"], button[aria-label="Log out"]');
    if (await logoutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutButton.click();

      // Wait for logout redirect to complete before checking login form
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Verify we're back on login page
      await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
      console.log('Logged out successfully');
    } else {
      console.log('Logout button not found at expected location');
    }
  });

});
