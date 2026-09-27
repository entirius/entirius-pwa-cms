<template>
  <div class="page-pad fs-300 t-body h-100 ov-h">
    <!-- Title shown by router titleKey in header bar -->
    <Teleport to="#pricing-toolbar-right" defer>
      <BasicButton
        variant="secondary"
        @click="syncChannels"
      >
        {{ $t('pm.sync_channels') }}
      </BasicButton>
    </Teleport>

    <div class="page-card h-100 ovy-auto">
      <Loader block v-show="loading" />

      <div v-show="!loading">
        <DataTable
          :columns="columns"
          :rows="channels"
          :empty-text="$t('pm.no_channels')"
          empty-size="md"
          @row-click="onRowClick"
        >
          <template #cell-idx="{ row }">
            <span class="fw-600 t-accent pointer" @click.stop="$router.push(`/pricing/channels/${row.idx}`)">
              {{ row.idx }}
            </span>
          </template>
          <template #cell-calculate_direction="{ row }">
            <span class="chip bg-raised t-secondary" :title="directionLabel(row)">
              <span class="chip__label">{{ directionLabel(row) }}</span>
            </span>
          </template>
          <template #cell-country_count="{ row }">
            <span class="chip bg-accent-subtle t-strong">
              {{ row.country_count ?? 0 }} {{ $t('pm.country_count') }}
            </span>
          </template>
        </DataTable>
      </div>

      <FloatingActions :actions="fabActions" />
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from '@/stores/loader'
import { useNotifyStore } from '@/stores/notify'
import { GET_PmChannels, POST_PmSyncChannels } from '@/api/pricemanager/api'
import { extractApiMessage } from '@/composables/useFormErrors'

export default {
  name: 'PmChannelList',
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    return { loader, notify }
  },
  data() {
    return {
      channels: [],
      loading: false,
    }
  },
  computed: {
    columns() {
      return [
        { key: 'idx', label: 'IDX', width: '200px' },
        { key: 'name', label: this.$t('pm.name'), width: '1fr' },
        { key: 'calculate_direction', label: this.$t('pm.direction'), width: '180px' },
        { key: 'country_count', label: this.$t('pm.country_count'), width: '130px' },
      ]
    },
    fabActions() {
      return [
        {
          icon: 'plus',
          label: this.$t('pm.create_channel'),
          handler: () => this.$router.push('/pricing/channels/create'),
        },
      ]
    },
  },
  mounted() {
    this.fetch()
  },
  methods: {
    directionLabel(row) {
      return row.calculate_direction === 'from_net_to_gross' ? this.$t('pm.from_net_to_gross') : this.$t('pm.from_gross_to_net')
    },
    async fetch() {
      this.loading = true
      try {
        const { data } = await GET_PmChannels()
        this.channels = Array.isArray(data) ? data : data.results || []
      } catch (err) {
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.error')),
        })
      } finally {
        this.loading = false
      }
    },
    async syncChannels() {
      this.loader.loaderStart()
      try {
        const { data } = await POST_PmSyncChannels()
        this.notify.spawnNotification({
          type: 'positive',
          msg: this.$t('pm.sync_result', {
            synced: data.synced ?? 0,
            created: data.created ?? 0,
            updated: data.updated ?? 0,
          }),
        })
        await this.fetch()
      } catch (err) {
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.error')),
        })
      } finally {
        this.loader.loaderFinish()
      }
    },
    onRowClick(row) {
      this.$router.push(`/pricing/channels/${row.idx}`)
    },
  },
}
</script>

<style lang="scss" scoped>
</style>
