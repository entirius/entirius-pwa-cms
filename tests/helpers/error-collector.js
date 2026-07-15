/**
 * Error Collector for Playwright Tests
 *
 * Captures console errors, uncaught exceptions, and HTTP failures
 * during page navigation. Provides structured reports for automated
 * validation of CMS pages.
 */

const DEFAULT_WHITELIST = [
  'favicon.ico',
  'hot-update',
  'sockjs-node',
  '__webpack_hmr',
];

/**
 * Create an error collector attached to a Playwright page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {string[]} options.whitelist - URL patterns to ignore
 * @returns {Object} collector API
 */
function createErrorCollector(page, { whitelist = [] } = {}) {
  const ignorePatterns = [...DEFAULT_WHITELIST, ...whitelist];

  const errors = {
    console: [],
    exceptions: [],
    network: [],
    requestFailed: [],
  };

  function isWhitelisted(url) {
    return ignorePatterns.some((pattern) => url.includes(pattern));
  }

  // Console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!ignorePatterns.some((p) => text.includes(p))) {
        errors.console.push(text);
      }
    }
  });

  // Uncaught exceptions
  page.on('pageerror', (error) => {
    errors.exceptions.push(error.message);
  });

  // HTTP 4xx/5xx responses
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !isWhitelisted(url)) {
      errors.network.push({ status, url });
    }
  });

  // CORS / network failures
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!isWhitelisted(url)) {
      const failure = request.failure();
      errors.requestFailed.push({
        url,
        reason: failure ? failure.errorText : 'unknown',
      });
    }
  });

  return {
    /**
     * Check if any errors were collected.
     */
    hasErrors() {
      return (
        errors.console.length > 0 ||
        errors.exceptions.length > 0 ||
        errors.network.length > 0 ||
        errors.requestFailed.length > 0
      );
    },

    /**
     * Get raw error arrays.
     */
    getErrors() {
      return { ...errors };
    },

    /**
     * Reset all collected errors (call between page navigations).
     */
    reset() {
      errors.console.length = 0;
      errors.exceptions.length = 0;
      errors.network.length = 0;
      errors.requestFailed.length = 0;
    },

    /**
     * Human-readable summary of collected errors.
     */
    getSummary() {
      const lines = [];

      if (errors.console.length > 0) {
        lines.push(`Console errors (${errors.console.length}):`);
        errors.console.forEach((msg) => lines.push(`  - ${msg.slice(0, 200)}`));
      }

      if (errors.exceptions.length > 0) {
        lines.push(`Uncaught exceptions (${errors.exceptions.length}):`);
        errors.exceptions.forEach((msg) => lines.push(`  - ${msg.slice(0, 200)}`));
      }

      if (errors.network.length > 0) {
        lines.push(`Network errors (${errors.network.length}):`);
        errors.network.forEach(({ status, url }) =>
          lines.push(`  - [${status}] ${url}`)
        );
      }

      if (errors.requestFailed.length > 0) {
        lines.push(`Request failures (${errors.requestFailed.length}):`);
        errors.requestFailed.forEach(({ url, reason }) =>
          lines.push(`  - ${url} (${reason})`)
        );
      }

      return lines.join('\n');
    },

    /**
     * Assert no errors were collected. Fails test with structured summary.
     * @param {import('@playwright/test').expect} expect
     * @param {string} context - Page name for error message
     */
    assertNoErrors(expect, context = 'Page') {
      if (this.hasErrors()) {
        const summary = this.getSummary();
        expect(false, `${context} had errors:\n${summary}`).toBeTruthy();
      }
    },
  };
}

module.exports = { createErrorCollector };
