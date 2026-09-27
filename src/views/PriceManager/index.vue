<template>
  <div class="pm-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div class="panel-toolbar__title flex ai-ct gap-5">
        <div id="pricing-toolbar-left" class="flex ai-ct gap-5"></div>
        <div v-if="showChannelSelector && channelOptions.length" class="flex ai-ct gap-5">
          <span class="field-label">{{ $t('pm.channel') }}</span>
          <Dropdown
            :values="channelOptions"
            :selected="[activeChannelIdx]"
            @onSelect="onChannelSelect"
          />
        </div>
      </div>
      <div id="pricing-toolbar-right" class="panel-toolbar__actions flex ai-ct gap-5"></div>
    </div>
    <router-view />
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { GET_PmChannels } from '@/api/pricemanager/api'

const route = useRoute()
const showChannelSelector = computed(() => {
  const name = route.name || ''
  return name.startsWith('PmPrice') // PmPriceList, PmPriceDetail
})

const channels = ref([])
const activeChannelIdx = ref('')

const channelOptions = computed(() =>
  channels.value.map((ch) => ({ value: ch.idx, label: ch.name }))
)

const activeChannel = computed(() =>
  channels.value.find((ch) => ch.idx === activeChannelIdx.value) || null
)

onMounted(async () => {
  try {
    const { data } = await GET_PmChannels()
    channels.value = Array.isArray(data) ? data : data.results || []
    if (channels.value.length) activeChannelIdx.value = channels.value[0].idx
  } catch {
    // child views handle the empty state
  }
})

function onChannelSelect(value) {
  activeChannelIdx.value = Array.isArray(value) ? value[0] : value
}

provide('pmChannelIdx', activeChannelIdx)
provide('pmChannels', channels)
provide('pmActiveChannel', activeChannel)
</script>

<style lang="scss" scoped>
.pm-panel {
  display: flex;
  flex-direction: column;
}
</style>
