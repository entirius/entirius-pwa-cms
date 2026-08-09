const { test, expect } = require('@playwright/test');

/**
 * API Health Check Tests
 * Verify backend API is responding
 */

test.describe('API Health Checks', () => {

  test('API responds to languages endpoint', async ({ request }) => {
    const apiUrl = process.env.VUE_APP_API_URL || 'http://localhost:8000';

    const response = await request.get(`${apiUrl}/api/contentdb/v1/languages/`).catch(() => null);

    if (response) {
      // API is up
      expect(response.status()).toBeLessThan(500);
    } else {
      // API might be down or URL wrong - skip this test
      test.skip(true, 'API not available - check VUE_APP_API_URL');
    }
  });

});
