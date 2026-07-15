import axios from 'axios'
import Cookies from 'universal-cookie'

const debugMode = JSON.parse((process.env.VUE_APP_DEBUG || 'false').toLowerCase())
const cookies = new Cookies()
const _CHANNEL = process.env.VUE_APP_CHANNEL

let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  failedQueue = []
}

function clearAllCookies() {
  const allCookies = cookies.getAll()
  Object.keys(allCookies).forEach((name) => {
    cookies.remove(name, { path: '/' })
  })
}

function sessionExpiredRedirect() {
  localStorage.setItem('session_expired', '1')
  localStorage.setItem('cms_return_route', window.location.pathname + window.location.search)
  clearAllCookies()
  window.location.href = '/'
}

function attachTokenRefresh(client) {
  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      const originalConfig = err.config

      if (!err.response) return Promise.reject(err)

      // 403 = permission denied (not session expired) — do NOT logout
      if (err.response.status === 403) {
        return Promise.reject(err.response?.data || err)
      }

      if (err.response.status !== 401 || originalConfig._retry) {
        return Promise.reject(err.response?.data || err)
      }

      // 401 — attempt token refresh
      originalConfig._retry = true

      if (isRefreshing) {
        // Another request already triggered refresh — wait for it
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalConfig.headers.Authorization = `Bearer ${token}`
          return client(originalConfig)
        })
      }

      isRefreshing = true

      const refreshCookie = cookies.get('refresh')
      if (!refreshCookie) {
        isRefreshing = false
        processQueue(new Error('No refresh token'), null)
        sessionExpiredRedirect()
        return
      }

      try {
        const url = `/api/accounts/v1/${_CHANNEL ?? ''}/customer/tokens/refresh/`
        const { data } = await axios.post(
          `${client.defaults.baseURL}${url}`,
          { refresh: refreshCookie }
        )

        const { access, refresh } = data.data || data
        const expiryDate = new Date(Date.now() + 15 * 60 * 1000)

        const cookieOpts = { path: '/', maxAge: 7 * 24 * 60 * 60 }
        cookies.set('token', access, cookieOpts)
        cookies.set('refresh', refresh, cookieOpts)
        cookies.set('expiryDate', expiryDate, cookieOpts)

        client.defaults.headers.common.Authorization = `Bearer ${access}`
        isRefreshing = false
        processQueue(null, access)

        originalConfig.headers.Authorization = `Bearer ${access}`
        return client(originalConfig)
      } catch (_error) {
        isRefreshing = false
        processQueue(_error, null)
        sessionExpiredRedirect()
        return Promise.reject(_error)
      }
    }
  )
}

export function createApiClient(baseURL, { authHeaderFn = null, tokenRefresh = false } = {}) {
  const client = axios.create({ baseURL })

  if (authHeaderFn) {
    client.interceptors.request.use(async (request) => {
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
