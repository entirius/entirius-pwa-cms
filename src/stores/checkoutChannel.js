import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GET_Channels } from '@/api/promo/api'

// Persist the operator's last picked checkout/promo channel between reloads.
// Per-user storage; falls back to env default when storage is empty or unreachable
// (private mode, SSR, blocked storage). Mirrors stores/pimChannel.js.
//
// NOTE: checkout channels are their OWN model (checkout.Channel), distinct from
// PIM channels — matched by idx but a separate set. Never reuse pimChannel here.
const STORAGE_KEY = 'checkout:lastSelectedChannel'

function readStoredChannel() {
  try {
    return window.localStorage?.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function writeStoredChannel(idx) {
  try {
    if (idx) window.localStorage?.setItem(STORAGE_KEY, idx)
  } catch {
    // ignore — storage access denied / quota exceeded
  }
}

export const useCheckoutChannelStore = defineStore('checkoutChannel', () => {
  const channels = ref([])
  const activeChannelIdx = ref(readStoredChannel() || process.env.VUE_APP_CHANNEL || '')
  const loading = ref(false)
  const fetched = ref(false)

  const activeChannel = computed(() =>
    channels.value.find(ch => ch.idx === activeChannelIdx.value) || null
  )

  async function fetchChannels() {
    if (fetched.value) return
    loading.value = true
    try {
      // The channels endpoint lists ALL checkout channels regardless of the URL
      // channel; pass the active one (or env default) just to satisfy the route.
      const urlChannel = activeChannelIdx.value || process.env.VUE_APP_CHANNEL || 'default-local'
      const { data } = await GET_Channels(urlChannel)
      channels.value = data.results || []
      fetched.value = true
      // Stale storage / env pointing at a channel that no longer exists — fall back
      // to the first available so the UI never targets a dead channel.
      if (channels.value.length && !channels.value.some(ch => ch.idx === activeChannelIdx.value)) {
        setActiveChannel(channels.value[0].idx)
      }
    } catch (err) {
      console.error('Failed to fetch checkout channels:', err)
    } finally {
      loading.value = false
    }
  }

  function setActiveChannel(idx) {
    activeChannelIdx.value = idx
    writeStoredChannel(idx)
  }

  return {
    channels,
    activeChannelIdx,
    loading,
    activeChannel,
    fetchChannels,
    setActiveChannel,
  }
})
