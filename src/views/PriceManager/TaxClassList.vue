<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <!-- Title shown by router titleKey in header bar -->

    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <Loader v-show="loading" />

      <div v-show="!loading">
        <p v-if="!taxClasses.length" class="t-basic-500 fs-300">
          {{ $t('pm.tax_classes') }}: —
        </p>

        <DataTable v-else :columns="columns" :rows="taxClasses" @row-click="onRowClick">
          <template #cell-name="{ row }">
            <span class="fw-600">{{ row.name }}</span>
          </template>
          <template #cell-rate_count="{ row }">
            <span class="chip bg-support-100 t-support-400">
              {{ row.rate_count ?? 0 }} {{ $t('pm.rate_count') }}
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
import { GET_PmTaxClasses } from '@/api/pricemanager/api'
import { extractApiMessage } from '@/composables/useFormErrors'

export default {
  name: 'PmTaxClassList',
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    return { loader, notify }
  },
  data() {
    return {
      taxClasses: [],
      loading: false,
    }
  },
  computed: {
    columns() {
      return [
        { key: 'idx', label: 'IDX', width: '180px' },
        { key: 'name', label: this.$t('pm.name'), width: '1fr' },
        { key: 'rate_count', label: this.$t('pm.rate_count'), width: '120px' },
      ]
    },
    fabActions() {
      return [
        {
          icon: 'plus',
          label: this.$t('pm.create_tax_class'),
          handler: () => this.$router.push('/pricing/tax-classes/create'),
        },
      ]
    },
  },
  mounted() {
    this.fetch()
  },
  methods: {
    async fetch() {
      this.loading = true
      try {
        const { data } = await GET_PmTaxClasses()
        this.taxClasses = Array.isArray(data) ? data : data.results || []
      } catch (err) {
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.error')),
        })
      } finally {
        this.loading = false
      }
    },
    onRowClick(row) {
      this.$router.push(`/pricing/tax-classes/${row.idx}`)
    },
  },
}
</script>

<style lang="scss" scoped>
</style>
