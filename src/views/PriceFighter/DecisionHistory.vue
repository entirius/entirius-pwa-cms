<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <div class="history__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('pricefighter.search_sku')"
          icon="search"
          class="history__search"
          @input="debouncedFetch(doSearch)"
        />
        <Dropdown
          v-if="channelOptions.length"
          :values="channelOptions"
          :selected="[channelFilter]"
          :placeholder="$t('pricefighter.all_channels')"
          can_remove_selected
          class="history__channel"
          @onSelect="onChannelSelect"
          @onRemoveSelected="onChannelSelect(null)"
        />
      </div>

      <Loader v-show="loading" />

      <div v-show="!loading">
        <EmptyState
          v-if="!decisions.length"
          :title="$t('pricefighter.no_history')"
          :message="$t('pricefighter.no_history_desc')"
          icon="clock-rotate-left"
        />

        <template v-else>
          <DataTable
            :columns="columns"
            :rows="decisions"
            row-key="id"
            expandable
            :empty-text="$t('pricefighter.no_history')"
          >
            <template #cell-sku="{ row }">
              <span class="fw-600 t-support-400">{{ row.sku }}</span>
            </template>
            <template #cell-market="{ row }">
              {{ row.channel_idx }} · {{ row.country }} / {{ row.currency }}
            </template>
            <template #cell-change="{ row }">
              <span v-if="row.old_price === row.new_price" class="t-basic-500">
                {{ row.new_price }} <span class="fs-100">· {{ $t('pricefighter.no_change') }}</span>
              </span>
              <span v-else>{{ row.old_price }} &rarr; <span class="fw-600">{{ row.new_price }}</span></span>
            </template>
            <template #cell-strategy="{ row }">
              <StatusBadge :label="$t(`pricefighter.recommendation_${row.strategy}`)" variant="informative" />
            </template>
            <template #cell-applied_by="{ row }">
              {{ row.applied_by || $t('pricefighter.system') }}
            </template>
            <template #cell-created_at="{ row }">
              {{ row.created_at }}
            </template>
            <template #expand="{ row }">
              <div v-if="row.reason" class="history__detail">
                <dl class="history__facts">
                  <dt>{{ $t('pricefighter.reference_price') }} (R)</dt>
                  <dd>
                    {{ fmt(row.reason.reference_price) }}
                    <span v-if="row.reason.estimator" class="t-basic-500 fs-100">({{ row.reason.estimator }})</span>
                  </dd>
                  <dt>{{ $t('pricefighter.baseline') }} (B)</dt>
                  <dd>{{ fmt(row.reason.baseline) }}</dd>
                  <dt>{{ $t('pricefighter.floor') }} (F)</dt>
                  <dd>{{ fmt(row.reason.floor) }}</dd>
                  <dt>{{ $t('pricefighter.current_price') }} (P)</dt>
                  <dd>{{ fmt(row.reason.current_price) }}</dd>
                  <dt>{{ $t('pricefighter.gap') }} ({{ $t('pricefighter.gap_baseline_short') }})</dt>
                  <dd>{{ fmt(row.reason.gap_baseline) }}</dd>
                  <dt>{{ $t('pricefighter.gap_current') }}</dt>
                  <dd>{{ fmt(row.reason.gap_current) }}</dd>
                  <dt v-if="row.reason.no_action_reason">{{ $t('pricefighter.reason') }}</dt>
                  <dd v-if="row.reason.no_action_reason">{{ row.reason.no_action_reason }}</dd>
                </dl>

                <div v-if="reasonObservations(row).length" class="history__obs-block">
                  <h4 class="history__obs-heading">{{ $t('pricefighter.observations') }}</h4>
                  <table class="history__obs">
                    <thead>
                      <tr>
                        <th>{{ $t('pricefighter.source') }}</th>
                        <th>{{ $t('pricefighter.price') }}</th>
                        <th>{{ $t('pricefighter.stock') }}</th>
                        <th>{{ $t('pricefighter.observed_at') }}</th>
                        <th>{{ $t('pricefighter.status') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(obs, i) in reasonObservations(row)"
                        :key="i"
                        :class="{ 'history__obs-row--invalid': obs.flag !== 'valid' }"
                      >
                        <td>{{ obs.source_idx }}</td>
                        <td>{{ obs.price }} {{ obs.currency || '' }}</td>
                        <td>{{ obs.stock != null ? obs.stock : '—' }}</td>
                        <td>{{ obs.ts }}</td>
                        <td>
                          <StatusBadge
                            :label="$t(`pricefighter.flag_${obs.flag}`)"
                            :variant="obs.flag === 'valid' ? 'positive' : 'neutral'"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <p v-else class="t-basic-500 fs-200">{{ $t('pricefighter.no_snapshot') }}</p>
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
  </div>
</template>

<script>
import { useLoaderStore } from '@/stores/loader'
import { useNotifyStore } from '@/stores/notify'
import { useSearchDebounce } from '@/composables/useSearchDebounce'
import { usePfChannels } from '@/composables/usePfChannels'
import { GET_PfHistory } from '@/api/pricefighter/api'
import { extractApiMessage } from '@/composables/useFormErrors'
import { PF_PAGE_SIZE, pfFormat } from './constants'

export default {
  name: 'PfDecisionHistory',
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    const { search, debouncedFetch } = useSearchDebounce()
    const { channelOptions, fetchChannels } = usePfChannels()
    return { loader, notify, search, debouncedFetch, channelOptions, fetchChannels }
  },
  data() {
    return {
      decisions: [],
      loading: false,
      channelFilter: null,
      currentPage: 1,
      pageSize: PF_PAGE_SIZE,
      totalCount: 0,
    }
  },
  computed: {
    columns() {
      return [
        { key: 'sku', label: this.$t('pricefighter.sku'), sortable: false, width: '1fr' },
        { key: 'market', label: this.$t('pricefighter.market'), sortable: false, width: '1.1fr' },
        { key: 'change', label: this.$t('pricefighter.price_change'), sortable: false, width: '1fr' },
        { key: 'strategy', label: this.$t('pricefighter.strategy'), sortable: false, width: '1fr' },
        { key: 'applied_by', label: this.$t('pricefighter.applied_by'), sortable: false, width: '1.2fr' },
        { key: 'created_at', label: this.$t('pricefighter.observed_at'), sortable: false, width: '1.2fr' },
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
    await this.fetchHistory()
  },
  methods: {
    async fetchHistory() {
      this.loading = true
      try {
        const params = { page: this.currentPage }
        if (this.channelFilter) params.channel = this.channelFilter
        if (this.search) params.sku = this.search
        const { data } = await GET_PfHistory(params)
        this.decisions = data.results || []
        this.totalCount = data.count || 0
      } catch (err) {
        this.decisions = []
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.error')),
        })
      } finally {
        this.loading = false
      }
    },
    onChannelSelect(value) {
      this.channelFilter = value
      this.currentPage = 1
      this.fetchHistory()
    },
    doSearch() {
      this.currentPage = 1
      this.fetchHistory()
    },
    onPageChange(page) {
      this.currentPage = page
      this.fetchHistory()
    },
    fmt: pfFormat,
    reasonObservations(row) {
      return Array.isArray(row.reason?.observations) ? row.reason.observations : []
    },
  },
}
</script>

<style lang="scss" scoped>
.history__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}

.history__search {
  flex: 1;
  min-width: 150px;
  max-width: 320px;
}

.history__channel {
  min-width: 160px;
  max-width: 220px;
}

.history__detail {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-500);
  align-items: flex-start;
}

.history__facts {
  display: grid;
  grid-template-columns: auto auto;
  gap: var(--space-100) var(--space-300);
  margin: 0;
  font-size: var(--fs-200);

  dt {
    color: var(--c-basic-500);
  }
  dd {
    margin: 0;
    color: var(--c-basic-800);
    font-weight: 600;
  }
}

.history__obs-block {
  flex: 1;
  min-width: 280px;
}

.history__obs-heading {
  margin: 0 0 var(--space-200);
  font-size: var(--fs-200);
  color: var(--c-basic-500);
}

.history__obs {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-200);

  th {
    text-align: left;
    color: var(--c-basic-500);
    font-weight: 500;
    padding: var(--space-50) var(--space-200) var(--space-50) 0;
  }
  td {
    padding: var(--space-50) var(--space-200) var(--space-50) 0;
    color: var(--c-basic-800);
  }
}

.history__obs-row--invalid td {
  color: var(--c-basic-500);
}
</style>
