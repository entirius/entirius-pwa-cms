import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GET_Languages, GET_ContentChannels } from '@/api/contentDB/api'

export const useContentDBChannelStore = defineStore('contentDBChannel', () => {
  const channels = ref([])
  const languages = ref([])
  const activeChannelIdx = ref(process.env.VUE_APP_CHANNEL || '')
  const loading = ref(false)
  const fetched = ref(false)

  const activeChannel = computed(() =>
    channels.value.find(ch => ch.idx === activeChannelIdx.value) || null
  )

  const defaultLanguage = computed(() => {
    if (activeChannel.value?.default_language) {
      return activeChannel.value.default_language.toLowerCase()
    }
    if (languages.value.length) {
      return (languages.value[0].iso2 || 'en').toLowerCase()
    }
    return 'en'
  })

  const availableLanguages = computed(() =>
    languages.value
      .map(l => (l.iso2 || '').toLowerCase())
      .filter(Boolean)
  )

  async function fetchChannelsAndLanguages() {
    if (fetched.value) return
    loading.value = true
    try {
      const [channelsRes, languagesRes] = await Promise.all([
        GET_ContentChannels({ limit: 100 }),
        GET_Languages({}),
      ])
      channels.value = channelsRes.data?.data || []
      languages.value = languagesRes.data?.data || []
      fetched.value = true
    } catch (err) {
      console.error('Failed to fetch ContentDB channels/languages:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    channels,
    languages,
    activeChannelIdx,
    loading,
    activeChannel,
    defaultLanguage,
    availableLanguages,
    fetchChannelsAndLanguages,
  }
})
