import { defineStore } from 'pinia'
import { ref } from 'vue'
import Cookies from 'universal-cookie'
import { User } from '@/configs/access'
import { PATCH_UserProfile } from '@/api/contentDB/api'
import { refreshAccessToken } from '@/api/createClient'
import { setLang, getLang } from '@/i18n'
import { refreshDelay } from '@/utils/jwt'

const cookies = new Cookies()
const COOKIE_OPTS = { path: '/', maxAge: 7 * 24 * 60 * 60 }

let sessionTimer = null

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(null)
  const refresh = ref(null)
  const customer_id = ref(null)
  const expiryDate = ref(null)
  const isAuth = ref(false)
  const activeApp = ref('pages')
  const isSidebarCollapsed = ref(false)
  const theme = ref('default')
  const lang = ref(getLang())
  const preferences = ref({})

  function setStateViaCookies(cookiesKeys) {
    const stateMap = { user, token, refresh, customer_id, expiryDate, isAuth }
    cookiesKeys.forEach((key) => {
      if (stateMap[key]) {
        stateMap[key].value = cookies.get(key)
      }
    })
  }

  function setUser({ username = '', first_name = '', last_name = '', email = '', permissions = [] }) {
    user.value = new User({ username, first_name, last_name, email, buildTypes: permissions })
    cookies.set('user', user.value, COOKIE_OPTS)
  }

  function setAuth({ token: t, refresh: r, customer_id: cid, expiryDate: exp }) {
    token.value = t
    refresh.value = r
    customer_id.value = cid
    expiryDate.value = exp

    cookies.set('token', t, COOKIE_OPTS)
    cookies.set('refresh', r, COOKIE_OPTS)
    cookies.set('customer_id', cid, COOKIE_OPTS)
    cookies.set('expiryDate', exp, COOKIE_OPTS)

    startSessionMonitor()
  }

  // The login flow calls this last: the app leaves the login wall only with the user already in the store.
  function markAuthenticated() {
    isAuth.value = true
    cookies.set('isAuth', true, COOKIE_OPTS)
  }

  function clearAuth() {
    stopSessionMonitor()

    user.value = null
    token.value = null
    customer_id.value = null
    refresh.value = null
    expiryDate.value = null
    isAuth.value = false

    const allCookies = cookies.getAll()
    Object.keys(allCookies).forEach((cookieName) => {
      cookies.remove(cookieName, { path: '/' })
    })
  }

  function sessionExpiredLogout() {
    stopSessionMonitor()
    // a first visit holds no token — it never hears that a session expired
    if (token.value || cookies.get('token')) localStorage.setItem('session_expired', '1')
    localStorage.setItem('cms_return_route', window.location.pathname + window.location.search)
    clearAuth()
    window.location.href = '/'
  }

  async function proactiveRefresh() {
    try {
      token.value = await refreshAccessToken()
      refresh.value = cookies.get('refresh')
      expiryDate.value = cookies.get('expiryDate')
      startSessionMonitor()
    } catch {
      sessionExpiredLogout()
    }
  }

  // Scheduled from the expiry the access token carried (`tokenExpiry`); the refresh is shared with the API clients.
  function startSessionMonitor() {
    stopSessionMonitor()

    const delay = refreshDelay(cookies.get('expiryDate'))
    if (delay === null) return

    sessionTimer = setTimeout(proactiveRefresh, delay)
  }

  function stopSessionMonitor() {
    if (sessionTimer) {
      clearTimeout(sessionTimer)
      sessionTimer = null
    }
  }

  function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
    localStorage.setItem('cms_sidebar_collapsed', isSidebarCollapsed.value)
    if (isAuth.value) {
      savePreference('cms_sidebar_collapsed', isSidebarCollapsed.value)
    }
  }

  function setLanguage(l, persist = true) {
    const normalized = l.toUpperCase()
    lang.value = normalized
    setLang(normalized)
    localStorage.setItem('cms_lang', normalized)
    if (persist && isAuth.value) {
      savePreference('cms_lang', normalized)
    }
  }

  function setTheme(t, persist = true) {
    theme.value = t
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('cms_theme', t)
    if (persist && isAuth.value) {
      savePreference('cms_theme', t)
    }
  }

  function loadPreferences(extra) {
    if (extra && typeof extra === 'object') {
      preferences.value = { ...extra }
      if (extra.cms_theme) {
        setTheme(extra.cms_theme, false)
      }
      if (extra.cms_lang) {
        setLanguage(extra.cms_lang, false)
      }
      if (extra.cms_sidebar_collapsed !== undefined) {
        isSidebarCollapsed.value = extra.cms_sidebar_collapsed
        localStorage.setItem('cms_sidebar_collapsed', extra.cms_sidebar_collapsed)
      }
    }
  }

  async function savePreference(key, value) {
    preferences.value[key] = value
    const cid = customer_id.value
    if (!cid) return
    try {
      await PATCH_UserProfile({ uid: cid, payload: { extra: { [key]: value } } })
    } catch {
      // Silently fail — preference will be saved next time
    }
  }

  function readCookies() {
    const allCookies = cookies.getAll()
    const cookiesKeys = Object.keys(allCookies)
    if (cookiesKeys.length) {
      setStateViaCookies(cookiesKeys)

      // Reconstruct User instance from deserialized plain object
      if (user.value && !(user.value instanceof User)) {
        const u = user.value
        user.value = new User({
          username: u.username,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          buildTypes: u.buildTypes || [],
        })
      }
    }
  }

  function appInit() {
    readCookies()

    const savedTheme = localStorage.getItem('cms_theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const t = savedTheme || (prefersDark ? 'dark' : 'default')
    setTheme(t, false)

    const savedLang = localStorage.getItem('cms_lang')
    if (savedLang) setLanguage(savedLang, false)

    const savedSidebar = localStorage.getItem('cms_sidebar_collapsed')
    if (savedSidebar !== null) isSidebarCollapsed.value = savedSidebar === 'true'

    // Start session monitor if authenticated
    if (isAuth.value) {
      startSessionMonitor()
    }
  }

  return {
    user, token, refresh, customer_id, expiryDate, isAuth,
    activeApp, isSidebarCollapsed, theme, lang, preferences,
    setAuth, markAuthenticated, clearAuth, setUser, toggleSidebar, setTheme,
    setLanguage, loadPreferences, savePreference,
    readCookies, appInit, sessionExpiredLogout
  }
})
