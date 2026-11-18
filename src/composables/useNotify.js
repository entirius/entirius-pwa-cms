import { useNotifyStore } from '@/stores/notify'
import { extractApiMessage } from '@/composables/useFormErrors'

export function useNotify() {
  const store = useNotifyStore()

  return {
    success: (msg, title = '') => store.spawnNotification({ msg, title, type: 'positive' }),
    error: (msg, title = '') => store.spawnNotification({ msg, title, type: 'negative' }),
    info: (msg, title = '') => store.spawnNotification({ msg, title, type: 'informative' }),
    warning: (msg, title = '') => store.spawnNotification({ msg, title, type: 'warning' }),
    hide: (uuid) => store.hideNotification(uuid),
  }
}

export function notifyApiError(notify, err, fallback) {
  return notify.spawnNotification({ type: 'negative', msg: extractApiMessage(err, fallback) })
}
