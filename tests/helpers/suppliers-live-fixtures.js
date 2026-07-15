/**
 * Live-backend fixtures helper for suppliers E2E tests.
 *
 * Inverse of suppliers-mock.js: NO route interception. Tests hit the real
 * Django backend at process.env.ENTIRIUS_API_BASE (default http://localhost:8100)
 * via the CMS's own fetch layer. Pre-condition: docker is up + seed-fresh ran.
 *
 * Helpers:
 *   - waitForSupplierProductStatus: polls real GET /products/{pk}/ until status
 *     matches expected (Celery async tolerance).
 *   - getJwt: acquires JWT token via /api/token/ (used for direct HTTP probes).
 */

const API_BASE = process.env.ENTIRIUS_API_BASE || 'http://localhost:8100';

/**
 * Acquire JWT token from real backend. Used for direct API probes that bypass
 * the CMS UI (e.g. waiting for a SP status to flip after async push).
 */
async function getJwt(username = 'admin', password = 'admin123') {
  const resp = await fetch(`${API_BASE}/api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!resp.ok) {
    throw new Error(`JWT acquisition failed: ${resp.status} ${await resp.text()}`);
  }
  const data = await resp.json();
  return data.access || data.token;
}

/**
 * Poll the real backend until the SupplierProduct reaches the expected status.
 * Tolerates Celery async lag (push -> pushed_pending_images -> pushed).
 *
 * @param {string} jwt
 * @param {number} pk
 * @param {string|string[]} expected  one or many acceptable statuses
 * @param {number} timeoutMs
 */
async function waitForSupplierProductStatus(jwt, pk, expected, timeoutMs = 30000) {
  const acceptable = Array.isArray(expected) ? expected : [expected];
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const resp = await fetch(`${API_BASE}/api/suppliers/v2/admin/products/${pk}/`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (resp.ok) {
      const data = await resp.json();
      last = data.status;
      if (acceptable.includes(last)) return data;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `SupplierProduct ${pk} did not reach status ${JSON.stringify(acceptable)} ` +
      `within ${timeoutMs}ms (last: ${last})`
  );
}

/**
 * Direct API probe: list events filtered by event_type, returns count.
 * Used to assert that an action emitted the expected IntegrationEvent.
 */
async function countEventsByType(jwt, eventType) {
  const resp = await fetch(
    `${API_BASE}/api/suppliers/v2/admin/events/?event_type=${eventType}&page_size=50`,
    { headers: { Authorization: `Bearer ${jwt}` } }
  );
  if (!resp.ok) return 0;
  const data = await resp.json();
  return (data.results || []).filter((e) => e.event_type === eventType).length;
}

/**
 * Probe backend health. Fails fast if Django is down.
 */
async function assertBackendHealthy() {
  try {
    const resp = await fetch(`${API_BASE}/api/schema/`, { method: 'GET' });
    if (!resp.ok && resp.status !== 401) {
      throw new Error(`Backend health probe returned ${resp.status}`);
    }
  } catch (err) {
    throw new Error(
      `Backend at ${API_BASE} is not reachable (${err.message}). ` +
        'Run: cd helms-deep && make dev && make seed-fresh'
    );
  }
}

module.exports = {
  API_BASE,
  getJwt,
  waitForSupplierProductStatus,
  countEventsByType,
  assertBackendHealthy,
};
