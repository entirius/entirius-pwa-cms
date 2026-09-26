import axios from 'axios'
import Cookies from 'universal-cookie'
import { expiresSoon, tokenExpiry } from '@/utils/jwt'

const debugMode = JSON.parse((process.env.VUE_APP_DEBUG || 'false').toLowerCase())
const cookies = new Cookies()
const _CHANNEL = process.env.VUE_APP_CHANNEL
const COOKIE_OPTS = { path: '/', maxAge: 7 * 24 * 60 * 60 }

let refreshPromise = null

function clearAllCookies() {
  const allCookies = cookies.getAll()
  Object.keys(allCookies).forEach((name) => {
    cookies.remove(name, { path: '/' })
  })
}

// Only a visit that held a session was logged out: a first visit (no token cookie) meets a plain login screen.
function sessionExpiredRedirect() {
  if (cookies.get('token')) localStorage.setItem('session_expired', '1')
  localStorage.setItem('cms_return_route', window.location.pathname + window.location.search)
  clearAllCookies()
  window.location.href = '/'
}

// The unwrapped v2 body carries no HTTP status (a 409 reads INVALID_REQUEST) — keep it as a
// non-enumerable `httpStatus` so callers can tell a conflict apart (isConflict).
function rejectWithBody(err) {
  const body = err.response.data
  if (body && typeof body === 'object') {
    Object.defineProperty(body, 'httpStatus', { value: err.response.status, configurable: true })
  }
  return Promise.reject(body || err)
}

export const isConflict = (err) => (err?.httpStatus ?? err?.response?.status) === 409

// The single token refresh: the 401 retry, the pre-request check and the user store's timer share one
// in-flight call, so a rotated refresh token is never sent twice.
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = postRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function postRefresh() {
  const refreshCookie = cookies.get('refresh')
  if (!refreshCookie) throw new Error('No refresh token')

  const url = `${process.env.VUE_APP_API_URL}/api/accounts/v1/${_CHANNEL ?? ''}/customer/tokens/refresh/`
  const { data } = await axios.post(url, { refresh: refreshCookie })
  const { access, refresh } = data.data || data

  cookies.set('token', access, COOKIE_OPTS)
  cookies.set('expiryDate', new Date(tokenExpiry(access)), COOKIE_OPTS)
  // The API only returns a new refresh token when rotation is enabled server-side.
  // Overwriting the cookie with undefined logs the user out on the next refresh.
  if (refresh) {
    cookies.set('refresh', refresh, COOKIE_OPTS)
  }
  return access
}

async function refreshOrLogout() {
  try {
    return await refreshAccessToken()
  } catch (error) {
    sessionExpiredRedirect()
    throw error
  }
}

// A cold load can hold a token that expired while the tab was closed. Munin answers it anonymously instead of
// with a 401, so the 401 retry never runs and admin panels vanish — refresh before sending instead.
async function refreshIfExpiring() {
  if (cookies.get('refresh') && expiresSoon(cookies.get('token'))) {
    await refreshOrLogout()
  }
}

function attachTokenRefresh(client) {
  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      const originalConfig = err.config

      if (!err.response) return Promise.reject(err)

      // 403 = permission denied (not session expired) — do NOT logout
      if (err.response.status === 403) {
        return rejectWithBody(err)
      }

      if (err.response.status !== 401 || originalConfig._retry) {
        return rejectWithBody(err)
      }

      // 401 — attempt token refresh
      originalConfig._retry = true
      const access = await refreshOrLogout()

      client.defaults.headers.common.Authorization = `Bearer ${access}`
      originalConfig.headers.Authorization = `Bearer ${access}`
      return client(originalConfig)
    }
  )
}

export function createApiClient(baseURL, { authHeaderFn = null, tokenRefresh = false } = {}) {
  const client = axios.create({ baseURL })

  if (authHeaderFn) {
    client.interceptors.request.use(async (request) => {
      if (tokenRefresh) await refreshIfExpiring()
      const authHeader = authHeaderFn()
      if (authHeader) {
        request.headers.Authorization = authHeader
      }
      return request
    })
  }

  if (tokenRefresh) {
    attachTokenRefresh(client)
  }

  if (debugMode) {
    client.interceptors.request.use((request) => {
      console.log(`%c${process.env.NODE_ENV} - REQUEST`, 'color:#68baaf')
      console.log(request.method?.toUpperCase(), request.url, request.data)
      return request
    })

    client.interceptors.response.use((response) => {
      console.log(`%c${response.config.url}`, 'color:#307a54;background:#aeebcc')
      console.log(`status: %c${response.status}`, 'color:#68baaf')
      console.log(response.data)
      return response
    })
  }

  return client
}
