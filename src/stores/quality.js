import { defineStore } from 'pinia'
import { ref } from 'vue'
import { GET_GapsStatus } from '@/api/pim/api'

// etap-06: soft-compat gate for the quality-rules screen. "quality" is a layer inside
// django-pim (NOT a munin panel), so we detect support by probing the gaps endpoint once.
// available === null  → not probed yet
// available === true   → backend exposes the gaps API (rules screen + nav item shown)
// available === false  → old backend (404/error) → nav item hidden, screen self-redirects
//
// The pim client's token-refresh interceptor strips `.response` from non-401/403 errors,
// so callers can't reliably read a 404 status — the probe's status-agnostic catch is the
// single source of truth for "is the gaps API there".
export const useQualityStore = defineStore('quality', () => {
  const available = ref(null)
  let inflight = null

  // Resolves once availability is known. Concurrent callers share one in-flight probe.
  function probe() {
    if (available.value !== null) return Promise.resolve()
    if (inflight) return inflight
    inflight = (async () => {
      try {
        await GET_GapsStatus()
        available.value = true
      } catch {
        available.value = false
      } finally {
        inflight = null
      }
    })()
    return inflight
  }

  return { available, probe }
})
