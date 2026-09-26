// Access-token timing comes from the token's own `exp` claim — the service decides the lifetime, not the client.
const REFRESH_LEAD_MS = 60 * 1000
const REFRESH_FLOOR_MS = 10 * 1000
// setTimeout overflows above this and fires at once; a client clock far behind the server's would spin.
const MAX_TIMER_MS = 2 ** 31 - 1

// Expiry of a JWT in ms since the epoch, or null when the token carries no readable `exp`.
export function tokenExpiry(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(payload))
    return Number.isFinite(exp) ? exp * 1000 : null
  } catch {
    return null
  }
}

// True when the token is expired or expires within the floor — a request sent with it would arrive stale.
export function expiresSoon(token) {
  const expiry = tokenExpiry(token)
  return expiry !== null && expiry - Date.now() < REFRESH_FLOOR_MS
}

// Delay of the proactive refresh: 60 s before expiry, never sooner than 10 s; null without a readable `exp`.
export function refreshDelay(token) {
  const expiry = tokenExpiry(token)
  if (expiry === null) return null
  return Math.min(Math.max(expiry - REFRESH_LEAD_MS - Date.now(), REFRESH_FLOOR_MS), MAX_TIMER_MS)
}
