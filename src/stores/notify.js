import { defineStore } from 'pinia'
import { ref, unref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { t } from '@/i18n'

const MAX_VISIBLE = 3
const DEFAULT_TIMEOUT = 5000

// Module-scope (not reactive) — setTimeout handles and pause state per uuid.
const timers = new Map()       // uuid -> setTimeout handle
const remaining = new Map()    // uuid -> ms left when paused
const startedAt = new Map()    // uuid -> last resume timestamp

export const useNotifyStore = defineStore('notify', () => {
  const notifications = ref([])
  const pending = ref([])

  function _scheduleHide(uuid, ms) {
    startedAt.set(uuid, Date.now())
    remaining.set(uuid, ms)
    timers.set(uuid, setTimeout(() => { hideNotification(uuid) }, ms))
  }

  function _showNext() {
    if (pending.value.length === 0) return
    if (notifications.value.length >= MAX_VISIBLE) return
    const next = pending.value.shift()
    notifications.value.push(next)
    _scheduleHide(next.uuid, next.timeout)
  }

  function spawnNotification({ title = '', msg = '', type = 'positive', timeout = DEFAULT_TIMEOUT }) {
    msg = unref(msg) || ''
    if (!title && !msg) msg = t('notifications.error') // never spawn an empty toast
    const uuid = `alert-${uuidv4()}`
    const item = { uuid, title, msg, type, timeout }
    if (notifications.value.length >= MAX_VISIBLE) {
      pending.value.push(item)
      return uuid
    }
    notifications.value.push(item)
    _scheduleHide(uuid, timeout)
    return uuid
  }

  function hideNotification(uuid) {
    notifications.value = notifications.value.filter(n => n.uuid !== uuid)
    const t = timers.get(uuid)
    if (t) { clearTimeout(t); timers.delete(uuid) }
    remaining.delete(uuid)
    startedAt.delete(uuid)
    _showNext()
  }

  function pauseTimer(uuid) {
    const t = timers.get(uuid)
    if (!t) return
    clearTimeout(t)
    timers.delete(uuid)
    const started = startedAt.get(uuid) ?? Date.now()
    const left = (remaining.get(uuid) ?? DEFAULT_TIMEOUT) - (Date.now() - started)
    remaining.set(uuid, Math.max(left, 500))
  }

  function resumeTimer(uuid) {
    if (timers.has(uuid)) return // already running
    const ms = remaining.get(uuid) ?? DEFAULT_TIMEOUT
    _scheduleHide(uuid, ms)
  }

  return {
    notifications,
    pending,
    spawnNotification,
    hideNotification,
    pauseTimer,
    resumeTimer,
  }
})
