import { ref, computed } from "vue"
import { GET_PfChannels } from "@/api/pricefighter/api"

/**
 * Shared channel-list fetch for PriceFighter views (GapTable, Strategies, DecisionHistory).
 * Each view still owns its own fetch call (no cross-view caching) — this only removes the
 * copy-pasted fetch/mapping logic.
 */
export function usePfChannels() {
  const channels = ref([])

  const channelOptions = computed(() =>
    channels.value.map((ch) => ({ value: ch.idx, label: ch.name }))
  )

  async function fetchChannels() {
    try {
      const { data } = await GET_PfChannels()
      channels.value = Array.isArray(data) ? data : data.results || []
    } catch {
      channels.value = []
    }
  }

  return { channels, channelOptions, fetchChannels }
}
