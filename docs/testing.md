# Testing -- CMS Blueprint

Playwright E2E tests in `tests/e2e/`. Requires a running CMS instance.

## Commands

```bash
npm run test:smoke          # Quick (7 tests, ~2 min)
npm test                    # Full suite (build + all e2e, ~7 min)
npm run test:comprehensive  # Content + Gallery + Layout + Content List
npm run test:layout         # Theme, sidebar, panels (9 tests)
npm run test:content-list   # Table, filters, pagination (3 tests)
npm run test:content        # Builder workflow (2 tests)
npm run test:gallery        # Gallery upload (3 tests)
```

## Test Suite

| File | Tests | Covers |
|---|---|---|
| `01-smoke.spec.js` | 7 | Login, page loads, redirects, auth persistence |
| `02-api.spec.js` | 1 | API health check |
| `03-content-builder.spec.js` | 2 | Builder sections, tiles in swiper |
| `04-gallery-upload.spec.js` | 3 | Upload, pagination, deletion |
| `05-theme-and-layout.spec.js` | 9 | Theme toggle, sidebar, panels, notifications |
| `06-content-list.spec.js` | 3 | Table, filters, pagination |
| `helpers/auth.js` | -- | `login(page)`, `logout(page)` |

**Total: 25 E2E + 6 build = 31 tests**

## Writing Tests

```javascript
const { test, expect } = require('@playwright/test')
const { login } = require('../helpers/auth')

test('should do something', async ({ page }) => {
  await login(page)
  await page.goto('/route')
  await expect(page.locator('h1')).toContainText('Title')
})
```

Use `waitForLoadState('networkidle')` not `waitForTimeout`. Prefer `text=Button` selectors.
