<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <!-- Toolbar -->
      <div class="gap-table__toolbar">
        <Dropdown
          v-if="channelOptions.length"
          :values="channelFilterOptions"
          :selected="[channelFilter || ALL_OPTION]"
          class="gap-table__channel"
          @onSelect="onChannelSelect"
        />
        <Dropdown
          :values="recommendationFilterOptions"
          :selected="[recommendationFilter || ALL_OPTION]"
          class="gap-table__recommendation"
          @onSelect="onRecommendationSelect"
        />
        <Switcher
          :label="$t('pricefighter.competitor_only')"
          :selected="competitorOnly"
          class="gap-table__competitor"
          @onSelect="toggleCompetitorOnly"
        />
      </div>

      <BulkActionBar
        v-if="selectedRows.length"
        :count="selectedRows.length"
        selected-label-key="pricefighter.rows_selected"
        clear-label-key="pricefighter.clear_selection"
        :actions="bulkActions"
        class="mb-400"
        @action="onBulkAction"
        @clear="onClearSelection"
      />

      <Loader v-show="loading" />

      <div v-show="!loading">
        <EmptyState
          v-if="!rows.length"
          :title="$t('pricefighter.no_decisions')"
          :message="$t('pricefighter.no_decisions_desc')"
          icon="scale-balanced"
        />

        <template v-else>
          <DataTable
            ref="table"
            :columns="columns"
            :rows="rows"
            row-key="_rowKey"
            sortable
            expandable
            selectable
            multi-select
            :empty-text="$t('pricefighter.no_decisions')"
            @sort="onSort"
            @select="selectedRows = $event"
          >
            <template #cell-sku="{ row }">
              <div class="flex flex-column">
                <span class="fw-600 t-support-400">{{ row.sku }}</span>
                <span class="t-basic-500 fs-200">{{ row.name }}</span>
              </div>
            </template>
            <template #cell-market="{ row }">
              {{ row.channel_idx }} · {{ row.country }} / {{ row.currency }}
            </template>
            <template #cell-current_price="{ row }">
              {{ fmt(row.current_price) }} <span class="gap-table__ccy">{{ row.currency }}</span>
            </template>
            <template #cell-cost="{ row }">
              {{ fmt(row.cost) }} <span class="gap-table__ccy">{{ row.currency }}</span>
            </template>
            <template #cell-reference_price="{ row }">
              {{ fmt(row.reference_price) }} <span class="gap-table__ccy">{{ row.currency }}</span>
            </template>
            <template #cell-gap_baseline="{ row }">
              <span :title="`${$t('pricefighter.gap_current')}: ${fmt(row.gap_current)}`">
                {{ fmt(row.gap_baseline) }}
              </span>
            </template>
            <template #cell-suggested_price="{ row }">
              <div class="suggested-cell">
                <span>{{ fmt(row.suggested_price) }} <span class="gap-table__ccy">{{ row.currency }}</span></span>
                <div v-if="row.clamped_floor || row.clamped_step" class="suggested-cell__badges">
                  <StatusBadge v-if="row.clamped_floor" :label="$t('pricefighter.clamped_floor')" variant="warning" />
                  <StatusBadge v-if="row.clamped_step" :label="$t('pricefighter.clamped_step')" variant="warning" />
                </div>
              </div>
            </template>
            <template #cell-recommendation="{ row }">
              <StatusBadge
                :label="$t(`pricefighter.recommendation_${row.recommendation}`)"
                :variant="recommendationVariant(row.recommendation)"
              />
            </template>
            <template #expand="{ row }">
              <GapRowDetail :row="row" />
            </template>
          </DataTable>

          <Pagination
            v-if="totalCount > pageSize"
            :pagination="paginationState"
            @onChangePage="onPageChange"
          />
        </template>
      </div>
    </div>

    <ApplyPreviewModal
      v-if="showPreview"
      :items="selectedRows"
      @applied="onApplied"
      @cancelled="showPreview = false"
    />
    <ApplyReport
      v-if="applyReport"
      :report="applyReport"
      @closed="onReportClosed"
    />
  </div>
</template>

<script>
import { useLoaderStore } from '@/stores/loader'
import { useNotifyStore } from '@/stores/notify'
import { usePfChannels } from '@/composables/usePfChannels'
import { GET_PfDecisions } from '@/api/pricefighter/api'
import { extractApiMessage } from '@/composables/useFormErrors'
import { PF_PAGE_SIZE, RECOMMENDATIONS, RECOMMENDATION_VARIANTS, pfFormat } from './constants'
import GapRowDetail from './components/GapRowDetail.vue'
import ApplyPreviewModal from './components/ApplyPreviewModal.vue'
import ApplyReport from './components/ApplyReport.vue'

const SORT_API_TOKEN = {
  sku: 'sku',
  name: 'name',
  current_price: 'current_price',
  reference_price: 'competitor_price',
  gap_baseline: 'gap',
}

export default {
  name: 'PfGapTable',
  components: { GapRowDetail, ApplyPreviewModal, ApplyReport },
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    const { channelOptions, fetchChannels } = usePfChannels()
    return { loader, notify, channelOptions, fetchChannels }
  },
  data() {
    return {
      rows: [],
      loading: false,
      channelFilter: null,
      recommendationFilter: null,
      competitorOnly: true,
      ALL_OPTION: '__all',
      sortKey: 'gap_baseline',
      sortDirection: 'desc',
      currentPage: 1,
      pageSize: PF_PAGE_SIZE,
      totalCount: 0,
      selectedRows: [],
      showPreview: false,
      applyReport: null,
    }
  },
  computed: {
    bulkActions() {
      return [{ key: 'apply', labelKey: 'pricefighter.apply_selected', buttonClass: 'bg-support-400 t-basic-100' }]
    },
    recommendationFilterOptions() {
      return [
        { value: this.ALL_OPTION, label: this.$t('pricefighter.all_recommendations') },
        ...RECOMMENDATIONS.map((r) => ({ value: r, label: this.$t(`pricefighter.recommendation_${r}`) })),
      ]
    },
    channelFilterOptions() {
      return [{ value: this.ALL_OPTION, label: this.$t('pricefighter.all_channels') }, ...this.channelOptions]
    },
    columns() {
      return [
        { key: 'sku', label: this.$t('pricefighter.sku'), sortable: true, width: '1.4fr' },
        { key: 'market', label: this.$t('pricefighter.market'), sortable: false, width: '1.1fr' },
        { key: 'current_price', label: this.$t('pricefighter.current_price'), sortable: true, width: '0.8fr' },
        { key: 'cost', label: this.$t('pricefighter.cost'), sortable: false, width: '0.7fr' },
        { key: 'reference_price', label: this.$t('pricefighter.competitor_price'), sortable: true, width: '0.8fr' },
        { key: 'gap_baseline', label: this.$t('pricefighter.gap'), sortable: true, width: '0.8fr' },
        { key: 'suggested_price', label: this.$t('pricefighter.suggested_price'), sortable: false, width: '1.3fr' },
        { key: 'recommendation', label: this.$t('pricefighter.recommendation'), sortable: false, width: '1fr' },
      ]
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.ceil(this.totalCount / this.pageSize),
      }
    },
  },
  async mounted() {
    await this.fetchChannels()
    await this.fetchRows()
  },
  methods: {
    fmt: pfFormat,
    recommendationVariant(rec) {
      return RECOMMENDATION_VARIANTS[rec] || 'neutral'
    },
    async fetchRows() {
      this.loading = true
      this.selectedRows = []
      try {
        const params = { page: this.currentPage, competitor_only: this.competitorOnly }
        if (this.channelFilter) params.channel = this.channelFilter
        if (this.recommendationFilter) params.recommendation = this.recommendationFilter
        const apiField = SORT_API_TOKEN[this.sortKey] || 'gap'
        params.sort = this.sortDirection === 'desc' ? `-${apiField}` : apiField
        const { data } = await GET_PfDecisions(params)
        this.rows = (data.results || []).map((row) => ({
          ...row,
          _rowKey: `${row.sku}|${row.channel_idx}|${row.country}|${row.currency}`,
        }))
        this.totalCount = data.count || 0
      } catch (err) {
        this.rows = []
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.error')),
        })
      } finally {
        this.loading = false
      }
    },
    onChannelSelect(value) {
      this.channelFilter = value === this.ALL_OPTION ? null : value
      this.currentPage = 1
      this.fetchRows()
    },
    onRecommendationSelect(value) {
      this.recommendationFilter = value === this.ALL_OPTION ? null : value
      this.currentPage = 1
      this.fetchRows()
    },
    toggleCompetitorOnly() {
      this.competitorOnly = !this.competitorOnly
      this.currentPage = 1
      this.fetchRows()
    },
    onSort({ key, direction }) {
      if (!key || !direction) {
        this.sortKey = 'gap_baseline'
        this.sortDirection = 'desc'
      } else {
        this.sortKey = key
        this.sortDirection = direction
      }
      this.currentPage = 1
      this.fetchRows()
    },
    onPageChange(page) {
      this.currentPage = page
      this.fetchRows()
    },
    onClearSelection() {
      this.selectedRows = []
      this.$refs.table?.clearSelection()
    },
    onBulkAction(key) {
      if (key === 'apply') this.showPreview = true
    },
    onApplied(report) {
      this.showPreview = false
      this.applyReport = report
    },
    onReportClosed() {
      this.applyReport = null
      this.onClearSelection()
      this.fetchRows()
    },
  },
}
</script>

<style lang="scss" scoped>
.gap-table__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}

.gap-table__channel,
.gap-table__recommendation {
  min-width: 160px;
  max-width: 220px;
}

/* Suggested price + clamp badges: stack vertically, right-aligned, so long
   badges ("Clamped by max step" / "Clamped to floor") wrap under the price
   instead of overflowing into the Gap column. */
.gap-table__ccy {
  color: var(--c-basic-500);
  font-size: var(--fs-100);
}

.suggested-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-50);
}

.suggested-cell__badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: var(--space-50);
}
</style>
