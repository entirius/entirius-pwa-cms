/**
 * Authentication Helper
 * Reusable login/logout functions for tests
 */

/**
 * Login to CMS
 * @param {import('@playwright/test').Page} page
 * @param {string} username - Default from env
 * @param {string} password - Default from env
 */
async function login(page, username = null, password = null) {
  await page.goto('/');

  // Wait for login form
  await page.waitForSelector('input[type="text"], input[name="username"]', {
    timeout: 10000
  });

  // Fill credentials
  const user = username || process.env.VUE_APP_USERNAME || 'admin';
  const pass = password || process.env.VUE_APP_PASSWORD || 'admin';

  // Try different selectors for username
  const usernameSelector = await page.locator('input[name="username"]').count() > 0
    ? 'input[name="username"]'
    : 'input[type="text"]';

  await page.fill(usernameSelector, user);

  // Try different selectors for password
  const passwordSelector = await page.locator('input[name="password"]').count() > 0
    ? 'input[name="password"]'
    : 'input[type="password"]';

  await page.fill(passwordSelector, pass);

  // Submit (label depends on VUE_APP_LANG: "Zaloguj" (PL) / "Log in" (EN))
  await page.click('button:has-text("Zaloguj"), button:has-text("Log in")');

  // Wait for navigation (adjust based on your app)
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

/**
 * Logout from CMS
 * @param {import('@playwright/test').Page} page
 */
async function logout(page) {
  // Look for logout button (adjust selector based on your app)
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Wyloguj")');

  if (await logoutButton.count() > 0) {
    await logoutButton.click();
    await page.waitForLoadState('networkidle');
  }
}

module.exports = { login, logout };
