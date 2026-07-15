import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GET_Channels } from '@/api/pim/api'

// etap-12 #25: persist the operator's last picked PIM channel between reloads.
// Per-user storage; falls back to env default when storage is empty or unreachable
// (private mode, SSR, blocked storage).
const STORAGE_KEY = 'pim:lastSelectedChannel'

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

export const usePimChannelStore = defineStore('pimChannel', () => {
  const channels = ref([])
  const activeChannelIdx = ref(readStoredChannel() || process.env.VUE_APP_CHANNEL || '')
  const loading = ref(false)

  const activeChannel = computed(() =>
    channels.value.find(ch => ch.idx === activeChannelIdx.value) || null
  )

  const activeChannelLanguages = computed(() =>
    activeChannel.value?.languages || []
  )

  const allLanguages = computed(() => {
    const seen = new Set()
    const result = []
    for (const ch of channels.value) {
      for (const lang of (ch.languages || [])) {
        if (!seen.has(lang)) {
          seen.add(lang)
          result.push(lang)
        }
      }
    }
    return result
  })

  const isDefaultChannel = computed(() =>
    activeChannel.value?.is_default === true
  )

  const defaultChannelIdx = computed(() =>
    channels.value.find(ch => ch.is_default)?.idx || null
  )

  const activeChannelInheritanceEnabled = computed(() =>
    activeChannel.value?.inheritance_enabled === true
  )

  const activeChannelDefaultFlags = computed(() =>
    activeChannel.value?.default_inheritance_flags || []
  )

  async function fetchChannels() {
    loading.value = true
    try {
      const { data } = await GET_Channels({ page_size: 100 })
      channels.value = data.results || []
    } catch (err) {
      console.error('Failed to fetch channels:', err)
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
    activeChannelLanguages,
    allLanguages,
    isDefaultChannel,
    defaultChannelIdx,
    activeChannelInheritanceEnabled,
    activeChannelDefaultFlags,
    fetchChannels,
    setActiveChannel,
  }
})
