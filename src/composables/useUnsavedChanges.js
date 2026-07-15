import { ref, watch, onBeforeUnmount } from 'vue'

export function useUnsavedChanges() {
  const original = ref(null)
  const current = ref(null)
  const isDirty = ref(false)
  const pendingNav = ref(null)

  function snapshot(data) {
    original.value = JSON.parse(JSON.stringify(data))
  }

  function track(formData) {
    current.value = formData
  }

  watch(current, () => {
    if (!original.value) return
    isDirty.value = JSON.stringify(current.value) !== JSON.stringify(original.value)
  }, { deep: true })

  const beforeUnloadHandler = (e) => { e.preventDefault() }

  watch(isDirty, (dirty) => {
    if (dirty) {
      window.addEventListener('beforeunload', beforeUnloadHandler)
    } else {
      window.removeEventListener('beforeunload', beforeUnloadHandler)
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
  })

  function guardNavigation(to, from, next) {
    if (!isDirty.value) return next()
    pendingNav.value = { to, next }
  }

  function confirmLeave() {
    const nav = pendingNav.value
    pendingNav.value = null
    isDirty.value = false
    if (nav) nav.next()
  }

  function cancelLeave() {
    pendingNav.value = null
  }

  return { isDirty, pendingNav, snapshot, track, guardNavigation, confirmLeave, cancelLeave }
}
