<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#pricing-toolbar-right" defer>
      <div v-if="dirtyCount > 0" class="flex ai-ct gap-100">
        <StatusBadge :label="`${dirtyCount} ${$t('pm.unsaved')}`" variant="warning" />
        <BasicButton
          :text="saving ? $t('pm.saving') : $t('pm.save_all')"
          class="bg-support-400 t-basic-100"
          :disabled="saving"
          @click="saveAll"
        />
      </div>
    </Teleport>

    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">

      <!-- Toolbar -->
      <div class="price-list__toolbar">
        <!-- Currency multi-select -->
        <Dropdown
          v-if="availableCurrencies.length"
          :custom_droplist="true"
          :placeholder="`${$t('pm.currency')} (${selectedCurrencies.length}/${availableCurrencies.length})`"
          class="price-list__currency"
        >
          <template #custom>
            <div
              v-for="code in availableCurrencies"
              :key="code"
              class="pointer flex jc-sb ai-ct ph-100 dropdown-list-el"
              :class="{ 'bg-primary-100': selectedCurrencies.includes(code) }"
              @click.stop="toggleCurrency(code)"
            >
              <span class="fw-600 ml-100">{{ code }}</span>
              <FontAwesomeIcon
                v-if="selectedCurrencies.includes(code)"
                icon="check"
                class="t-positive-200"
              />
            </div>
          </template>
        </Dropdown>

        <!-- Default country (read-only) -->
        <span v-if="defaultCountry" class="price-list__country-label t-basic-500 fs-200">
          {{ $t('pm.default_country_label', { country: defaultCountry }) }}
        </span>

        <!-- Search -->
        <BasicInput
          v-model="search"
          :placeholder="$t('pm.search_sku')"
          icon="search"
          class="price-list__search"
          @input="debouncedFetch(doSearch)"
        />

        <!-- Filter chips -->
        <div class="flex ai-ct gap-100">
          <FilterChip
            :label="$t('pm.all_products')"
            :active="activeFilter === 'all'"
            @click="setFilter('all')"
          />
          <FilterChip
            :label="$t('pm.with_price')"
            :active="activeFilter === 'with_price'"
            @click="setFilter('with_price')"
          />
          <FilterChip
            :label="$t('pm.without_price')"
            :active="activeFilter === 'without_price'"
            @click="setFilter('without_price')"
          />
        </div>

        <!-- Save All is teleported to #pricing-toolbar-right -->
      </div>

      <Loader v-show="loading" />

      <div v-show="!loading">
        <EmptyState
          v-if="!channelIdx"
          :title="$t('pm.select_channel')"
          :message="$t('pm.select_channel')"
          icon="tag"
        />

        <p v-else-if="!rows.length && !loading" class="t-basic-500 fs-300">
          {{ $t('pm.no_prices') }}
        </p>

        <template v-else>
          <!-- Table header -->
          <div class="pm-price-table">
            <div class="pm-price-table__head">
              <span>{{ $t('pm.sku') }}</span>
              <span>{{ $t('pm.tax_class') }}</span>
              <span></span>
              <span>{{ isNetEditable ? $t('pm.net') : $t('pm.gross') }}</span>
              <span>{{ isNetEditable ? $t('pm.gross') : $t('pm.net') }}</span>
              <span>{{ $t('pm.special_net') }}</span>
              <span>{{ $t('pm.special_gross') }}</span>
              <span>{{ $t('pm.special_from') }}</span>
              <span>{{ $t('pm.special_to') }}</span>
              <span></span>
              <span></span>
            </div>

            <template v-for="row in rows" :key="row.sku + '|' + (row.currency || '')">
              <!-- Main row -->
              <div
                class="pm-price-table__row"
                :class="{ 'pm-price-table__row--dirty': dirtyRows.has(rowKey(row)) }"
              >
                <!-- SKU -->
                <span class="fw-600 t-support-400 pointer text-truncate" @click="goToDetail(row.sku)">
                  {{ row.sku }}
                </span>

                <!-- Tax Class -->
                <span class="t-basic-500 fs-200">{{ row.tax_class || '—' }}</span>

                <!-- Currency -->
                <span class="fw-700 fs-200">{{ row.currency || activeCurrency }}</span>

                <!-- Net -->
                <BasicInput
                  :modelValue="getDirtyField(rowKey(row), 'value', primaryValue(row))"
                  class="pm-price-input"
                  @change="setDirty(rowKey(row), 'value', $event.target.value, row)"
                />

                <!-- Calculated: Gross (or Net), read-only -->
                <span class="t-basic-500">{{ formatPrice(calculatedValue(row)) }}</span>

                <!-- Special -->
                <BasicInput
                  :modelValue="getDirtyField(rowKey(row), 'special_value', specialValue(row))"
                  class="pm-price-input"
                  @change="setDirty(rowKey(row), 'special_value', $event.target.value, row)"
                />

                <!-- Special Gross (read-only) -->
                <span class="t-basic-500">{{ formatPrice(specialGrossValue(row)) }}</span>

                <!-- Special From -->
                <input
                  type="date"
                  class="pm-date-native"
                  :value="getDirtyField(rowKey(row), 'special_from_date', row.special_from_date || '')"
                  @change="setDirty(rowKey(row), 'special_from_date', $event.target.value, row)"
                />

                <!-- Special To -->
                <input
                  type="date"
                  class="pm-date-native"
                  :value="getDirtyField(rowKey(row), 'special_to_date', row.special_to_date || '')"
                  @change="setDirty(rowKey(row), 'special_to_date', $event.target.value, row)"
                />

                <!-- Actions: eye + flush special + delete -->
                <div class="flex ai-ct gap-50">
                  <button
                    v-if="row.has_price && hasMultipleCountries"
                    class="pm-expand-btn"
                    :class="{ 'pm-expand-btn--active': expandedSkus.has(row.sku) }"
                    :title="$t('pm.expand_countries')"
                    @click="toggleExpand(row.sku)"
                  >
                    <FontAwesomeIcon icon="eye" />
                  </button>
                  <button
                    v-if="row.has_price"
                    class="pm-action-btn pm-action-btn--flush"
                    :title="$t('pm.flush_special_tooltip')"
                    @click="confirmFlush(row.sku, row.currency)"
                  >
                    <FontAwesomeIcon icon="broom" />
                  </button>
                  <button
                    v-if="row.has_price"
                    class="pm-action-btn pm-action-btn--delete"
                    :title="$t('pm.delete_prices_tooltip')"
                    @click="confirmDelete(row.sku, row.currency)"
                  >
                    <FontAwesomeIcon icon="trash-can" />
                  </button>
                </div>

                <!-- Status -->
                <div class="flex ai-ct gap-100">
                  <StatusBadge
                    v-if="!row.has_price"
                    :label="$t('pm.no_price_set')"
                    variant="neutral"
                  />
                  <StatusBadge
                    v-else-if="dirtyRows.has(rowKey(row))"
                    :label="$t('pm.unsaved')"
                    variant="warning"
                  />
                </div>
              </div>

              <!-- Expanded sub-table -->
              <div
                v-if="expandedSkus.has(row.sku)"
                class="pm-expand"
              >
                <Loader v-if="!expandedData[row.sku]" />
                <template v-else>
                  <div class="pm-expand__head">
                    <span>{{ $t('pm.country') }}</span>
                    <span>{{ $t('pm.tax_rate') }}</span>
                    <span>{{ $t('pm.net') }}</span>
                    <span>{{ $t('pm.gross') }}</span>
                    <span>{{ $t('pm.special_net') }} → {{ $t('pm.special_gross') }}</span>
                  </div>
                  <div
                    v-for="cr in expandedData[row.sku]"
                    :key="cr.country"
                    class="pm-expand__row"
                  >
                    <span class="fw-600">{{ cr.country }}</span>
                    <span class="t-basic-500">{{ cr.tax_rate != null ? cr.tax_rate + '%' : '—' }}</span>
                    <span>{{ formatPrice(cr.net) }}</span>
                    <span>{{ formatPrice(cr.gross) }}</span>
                    <span class="t-basic-500">
                      <template v-if="cr.special_net">
                        {{ formatPrice(cr.special_net) }} → {{ formatPrice(cr.special_gross) }}
                      </template>
                      <template v-else>—</template>
                    </span>
                  </div>
                </template>
              </div>
            </template>
          </div>

          <Pagination
            v-if="totalCount > pageSize"
            :pagination="paginationState"
            @onChangePage="onPageChange"
          />
        </template>
      </div>
    </div>

    <FloatingActions :actions="fabActions" />

    <Confirmation-modal
      :visible="!!pendingFlushSku"
      @accept="doFlushSpecial"
      @reject="pendingFlushSku = null"
    >
      <template #header><h2>{{ $t('pm.flush_special') }}</h2></template>
      <template #description><p>{{ $t('pm.flush_special_confirm') }}</p></template>
    </Confirmation-modal>

    <Confirmation-modal
      :visible="!!pendingDeleteSku"
      @accept="doDeletePrices"
      @reject="pendingDeleteSku = null"
    >
      <template #header><h2>{{ $t('pm.delete_prices') }}</h2></template>
      <template #description><p>{{ $t('pm.delete_prices_confirm') }}</p></template>
    </Confirmation-modal>
  </div>
</template>

<script>
import { useLoaderStore } from '@/stores/loader'
import { useNotifyStore } from '@/stores/notify'
import { useSearchDebounce } from '@/composables/useSearchDebounce'
import {
  GET_PmPrices,
  GET_PmPriceDetail,
  GET_PmPriceProducts,
  PATCH_PmBulkPrices,
  DELETE_PmPrice,
  POST_PmFlushSpecial,
} from '@/api/pricemanager/api'
import ConfirmationModal from '@/functionals/Confirmation-modal/index.vue'
import { extractApiMessage } from '@/composables/useFormErrors'

export default {
  name: 'PmPriceList',
  components: { ConfirmationModal },
  inject: {
    pmChannelIdx: { default: null },
    pmActiveChannel: { default: null },
  },
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    const { search, debouncedFetch } = useSearchDebounce()
    return { loader, notify, search, debouncedFetch }
  },
  data() {
    return {
      prices: [],
      products: [],
      loading: false,
      saving: false,
      pendingFlushSku: null,
      pendingDeleteSku: null,
      currentPage: 1,
      pageSize: 20,
      totalCount: 0,
      activeCurrency: '',
      selectedCurrencies: [],
      availableCurrencies: [],
      activeFilter: 'all',
      dirtyRows: new Map(),
      expandedSkus: new Set(),
      expandedData: {},
    }
  },
  computed: {
    channelIdx() {
      const v = this.pmChannelIdx
      return (typeof v === 'object' && v !== null) ? (v.value || '') : (v || '')
    },
    activeChannel() {
      const ch = this.pmActiveChannel
      return (typeof ch === 'object' && ch !== null && 'value' in ch) ? ch.value : ch
    },
    defaultCountry() {
      return this.activeChannel?.default_country || ''
    },
    isNetEditable() {
      return (this.activeChannel?.calculate_direction || 'from_net_to_gross') === 'from_net_to_gross'
    },
    hasMultipleCountries() {
      const countries = this.activeChannel?.calculate_countries
      return Array.isArray(countries) ? countries.length > 1 : false
    },
    dirtyCount() {
      return this.dirtyRows.size
    },
    currencyOptions() {
      return this.availableCurrencies.map((c) => ({ value: c, label: c }))
    },
    // Merge prices + no-price products into unified rows list
    rows() {
      if (this.activeFilter === 'without_price') {
        return this.products.map((p) => ({
          sku: p.sku,
          tax_class: p.tax_class || '',
          has_price: false,
          countries: [],
        }))
      }
      const priceRows = this.prices.map((p) => ({ ...p, has_price: true }))
      if (this.activeFilter === 'with_price') return priceRows
      // 'all': prices + missing-currency rows for partially-priced SKUs + fully unpriced
      const priceKeys = new Set(this.prices.map((p) => p.sku + '|' + (p.currency || '')))
      const pricedSkus = {}
      for (const p of this.prices) {
        if (!pricedSkus[p.sku]) pricedSkus[p.sku] = p.tax_class || ''
      }
      // For SKUs with some prices, add "No price" rows for missing currencies
      const missingRows = []
      for (const [sku, taxClass] of Object.entries(pricedSkus)) {
        for (const cur of this.selectedCurrencies) {
          if (!priceKeys.has(sku + '|' + cur)) {
            missingRows.push({ sku, tax_class: taxClass, currency: cur, has_price: false, countries: [] })
          }
        }
      }
      // Fully unpriced products — one row per selected currency
      const allPricedSkus = new Set(Object.keys(pricedSkus))
      const currencies = this.selectedCurrencies.length ? this.selectedCurrencies : [this.activeCurrency || 'EUR']
      const noPriceRows = []
      for (const p of this.products) {
        if (allPricedSkus.has(p.sku)) continue
        for (const cur of currencies) {
          noPriceRows.push({ sku: p.sku, tax_class: p.tax_class || '', currency: cur, has_price: false, countries: [] })
        }
      }
      return [...priceRows, ...missingRows, ...noPriceRows]
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.ceil(this.totalCount / this.pageSize),
      }
    },
    fabActions() {
      return [
        {
          icon: 'plus',
          label: this.$t('pm.add_product'),
          handler: () => this.$router.push('/pricing/prices/new'),
        },
      ]
    },
  },
  watch: {
    channelIdx(val) {
      if (!val) return
      this.dirtyRows = new Map()
      this.expandedSkus = new Set()
      this.expandedData = {}
      this.currentPage = 1
      this.activeCurrency = ''
      this.availableCurrencies = []
      this.selectedCurrencies = []
      this.fetchAll()
    },
  },
  mounted() {
    if (this.channelIdx) this.fetchAll()
  },
  methods: {
    // --- Data loading ---
    async fetchAll() {
      if (!this.channelIdx) return
      this.loading = true
      try {
        // First detect available currencies if not yet known
        if (!this.availableCurrencies.length) {
          await this.syncCurrencies()
        }
        await Promise.all([this.fetchPrices(), this.fetchProducts()])
      } finally {
        this.loading = false
      }
    },
    async fetchPrices() {
      const params = { page: this.currentPage, page_size: this.pageSize }
      if (this.selectedCurrencies.length) params.currency = this.selectedCurrencies.join(',')
      if (this.search) params.search = this.search
      try {
        const { data } = await GET_PmPrices(this.channelIdx, params)
        this.prices = data.results || []
        this.totalCount = data.count || 0
      } catch (err) {
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.error')),
        })
      }
    },
    async fetchProducts() {
      if (this.activeFilter === 'with_price') return
      const params = {}
      params.currency = this.selectedCurrencies[0] || this.availableCurrencies[0] || 'EUR'
      if (this.search) params.search = this.search
      try {
        const { data } = await GET_PmPriceProducts(this.channelIdx, params)
        this.products = data.results || data || []
      } catch {
        this.products = []
      }
    },
    async syncCurrencies() {
      // Fetch all prices (no currency filter) for first page to detect available currencies
      try {
        const { data } = await GET_PmPrices(this.channelIdx, { page_size: 100 })
        const results = data.results || data || []
        const seen = new Set()
        results.forEach((p) => {
          const countries = p.countries || []
          countries.forEach((c) => { if (c.currency) seen.add(c.currency) })
          if (p.currency) seen.add(p.currency)
        })
        if (seen.size) {
          this.availableCurrencies = [...seen].sort()
          // Select all currencies by default
          if (!this.selectedCurrencies.length) {
            this.selectedCurrencies = [...this.availableCurrencies]
          }
          this.activeCurrency = this.selectedCurrencies[0] || this.availableCurrencies[0]
        }
      } catch { /* ignore — currencies stay empty */ }
    },
    // --- UI events ---
    toggleCurrency(code) {
      const idx = this.selectedCurrencies.indexOf(code)
      if (idx >= 0) {
        if (this.selectedCurrencies.length === 1) return // keep at least 1
        this.selectedCurrencies.splice(idx, 1)
      } else {
        this.selectedCurrencies.push(code)
      }
      this.activeCurrency = this.selectedCurrencies[0]
      this.currentPage = 1
      this.dirtyRows = new Map()
      this.fetchAll()
    },
    setFilter(filter) {
      if (this.activeFilter === filter) return
      this.activeFilter = filter
      this.currentPage = 1
      this.dirtyRows = new Map()
      this.expandedSkus = new Set()
      this.fetchAll()
    },
    doSearch() {
      this.currentPage = 1
      this.dirtyRows = new Map()
      this.fetchAll()
    },
    onPageChange(page) {
      this.currentPage = page
      this.dirtyRows = new Map()
      this.fetchPrices()
    },
    goToDetail(sku) {
      this.$router.push(`/pricing/prices/${sku}`)
    },
    // --- Expand / collapse ---
    async toggleExpand(sku) {
      const next = new Set(this.expandedSkus)
      if (next.has(sku)) {
        next.delete(sku)
        this.expandedSkus = next
        return
      }
      next.add(sku)
      this.expandedSkus = next
      if (this.expandedData[sku]) return
      try {
        const { data } = await GET_PmPriceDetail(this.channelIdx, sku)
        this.expandedData = {
          ...this.expandedData,
          [sku]: data.prices || data.countries || data.rows || [],
        }
      } catch {
        this.expandedData = { ...this.expandedData, [sku]: [] }
      }
    },
    // --- Dirty state ---
    rowKey(row) {
      return row.sku + '|' + (row.currency || '')
    },
    getDirtyField(key, field, fallback) {
      const entry = this.dirtyRows.get(key)
      if (!entry || !(field in entry)) return fallback
      return entry[field]
    },
    setDirty(key, field, value, row) {
      const existing = this.dirtyRows.get(key) || { sku: row.sku, currency: row.currency, _original: row }
      // Normalize commas to dots for price fields
      if ((field === 'value' || field === 'special_value') && value) {
        value = String(value).replace(',', '.').trim()
      }
      existing[field] = value
      this.dirtyRows.set(key, existing)
      this.dirtyRows = new Map(this.dirtyRows)
    },
    // --- Price helpers ---
    primaryValue(row) {
      const c = (row.countries || [])[0]
      const raw = this.isNetEditable ? (c ? c.net : row.net) : (c ? c.gross : row.gross)
      return this.fmt(raw)
    },
    calculatedValue(row) {
      const dirty = this.dirtyRows.get(this.rowKey(row))
      if (dirty && dirty.value) return null
      const c = (row.countries || [])[0]
      const raw = this.isNetEditable ? (c ? c.gross : row.gross) : (c ? c.net : row.net)
      return raw
    },
    specialValue(row) {
      const c = (row.countries || [])[0]
      const raw = this.isNetEditable ? (c ? c.special_net : row.special_net) : (c ? c.special_gross : row.special_gross)
      return this.fmt(raw)
    },
    specialGrossValue(row) {
      const c = (row.countries || [])[0]
      const raw = this.isNetEditable ? (c ? c.special_gross : row.special_gross) : (c ? c.special_net : row.special_net)
      return raw
    },
    fmt(val) {
      if (val == null || val === '') return ''
      const num = Number(val)
      return isNaN(num) ? '' : num.toFixed(2)
    },
    formatPrice(val) {
      if (val == null || val === '') return '—'
      const num = Number(val)
      if (isNaN(num)) return '—'
      return num.toFixed(2)
    },
    // --- Save ---
    async saveAll() {
      if (!this.dirtyRows.size) return
      this.saving = true
      this.loader.loaderStart()
      try {
        // Group dirty rows by currency (bulk endpoint takes one currency_code per call)
        const byCurrency = {}
        for (const r of this.dirtyRows.values()) {
          const hasValue = r.value != null && r.value !== ''
          const hasSpecial = 'special_value' in r
          if (!hasValue && !hasSpecial && !r.special_from_date && !r.special_to_date) continue
          const cur = r.currency || this.selectedCurrencies[0] || this.activeCurrency
          if (!byCurrency[cur]) byCurrency[cur] = []
          // For special-only edits, value can be omitted (backend handles it)
          const normalizedValue = hasValue ? String(r.value).replace(',', '.').trim() : undefined
          // Explicitly send null to clear special, undefined to leave unchanged
          let normalizedSpecial = undefined
          if (hasSpecial) {
            normalizedSpecial = r.special_value ? String(r.special_value).replace(',', '.').trim() : null
          }
          const item = {
            sku: r.sku,
            value: normalizedValue || undefined,
            special_value: normalizedSpecial,
            special_from_date: r.special_from_date || undefined,
            special_to_date: r.special_to_date || undefined,
          }
          // Include tax_class_idx for "no price" products
          if (r._original?.has_price === false && r._original?.tax_class) {
            item.tax_class_idx = r._original.tax_class
          }
          byCurrency[cur].push(item)
        }
        let totalUpdated = 0
        let totalLogged = 0
        for (const [currencyCode, items] of Object.entries(byCurrency)) {
          const { data } = await PATCH_PmBulkPrices(this.channelIdx, {
            items,
            currency_code: currencyCode,
          })
          totalUpdated += data.updated ?? items.length
          totalLogged += data.logged ?? 0
        }
        this.dirtyRows = new Map()
        this.notify.spawnNotification({
          type: 'positive',
          msg: this.$t('pm.bulk_save_success', {
            updated: totalUpdated,
            logged: totalLogged,
          }),
        })
        await this.fetchPrices()
      } catch (err) {
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.save_error')),
        })
      } finally {
        this.saving = false
        this.loader.loaderFinish()
      }
    },
    confirmFlush(sku, currency) {
      this.pendingFlushSku = { sku, currency }
    },
    confirmDelete(sku, currency) {
      this.pendingDeleteSku = { sku, currency }
    },
    async doFlushSpecial() {
      const { sku, currency } = this.pendingFlushSku
      this.pendingFlushSku = null
      this.loader.loaderStart()
      try {
        await POST_PmFlushSpecial(this.channelIdx, sku, currency)
        this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.success') })
        await this.fetchPrices()
      } catch (err) {
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.error')),
        })
      } finally {
        this.loader.loaderFinish()
      }
    },
    async doDeletePrices() {
      const { sku, currency } = this.pendingDeleteSku
      this.pendingDeleteSku = null
      this.loader.loaderStart()
      try {
        await DELETE_PmPrice(this.channelIdx, sku, currency)
        this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.success') })
        await this.fetchAll()
      } catch (err) {
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.error')),
        })
      } finally {
        this.loader.loaderFinish()
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.price-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}

.price-list__currency {
  min-width: 100px;
  max-width: 140px;
}

.price-list__country-label {
  white-space: nowrap;
  flex-shrink: 0;
}

.price-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 320px;
}

// --- Table ---

.pm-price-table {
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  overflow-x: auto;
  // min-width ensures horizontal scroll instead of crushing columns
  min-width: 900px;
}

// SKU | Tax | Cur | Net | Gross | Spec.Net | Spec.Gross | From | To | Eye | Status
// minmax keeps columns readable; fr units share leftover space
$cols:
  minmax(100px, 1.5fr) // SKU
  minmax(70px, 1fr)    // Tax Class
  40px                 // Currency
  minmax(80px, 1fr)    // Net (input)
  minmax(60px, 1fr)    // Gross (readonly)
  minmax(70px, 1fr)    // Special Net (input)
  minmax(55px, 0.8fr)  // Special Gross (readonly)
  minmax(90px, 1fr)    // Promo Start
  minmax(90px, 1fr)    // Promo End
  70px                 // Actions (eye + flush + delete)
  60px;                // Status

.pm-price-table__head {
  display: grid;
  grid-template-columns: $cols;
  gap: 6px;
  padding: 10px 12px;
  background: var(--c-basic-200);
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
}

.pm-price-table__row {
  display: grid;
  grid-template-columns: $cols;
  gap: 6px;
  padding: 6px 12px;
  border-top: 1px solid var(--c-basic-300);
  align-items: center;
  min-height: 40px;

  &--dirty {
    background: rgba(255, 193, 7, 0.06);
    border-left: 3px solid var(--c-warning-200);
  }

  &:hover {
    background: var(--c-basic-200);
  }
}

.pm-price-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pm-currency-tag {
  font-size: var(--fs-100);
  font-weight: 700;
  color: var(--c-basic-600);
  white-space: nowrap;
  flex-shrink: 0;
}

.pm-price-input {
  flex: 1;
  min-width: 0;
}

.pm-date-native {
  height: var(--elem-height);
  padding: 2px 6px;
  border: 1px solid var(--c-basic-400);
  border-radius: var(--radius-sm);
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  font-size: var(--fs-100);
  width: 100%;
  max-width: 100%;
  cursor: pointer;

  &::-webkit-calendar-picker-indicator {
    cursor: pointer;
    filter: invert(0.5);
  }

  [data-theme="dark"] & {
    background: var(--c-basic-200);
    border-color: var(--c-basic-400);
    color: var(--c-basic-800);
    color-scheme: dark;
  }
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// --- Expand button ---

.pm-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-sm);
  background: var(--c-basic-100);
  color: var(--c-basic-500);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  flex-shrink: 0;

  &:hover {
    background: var(--c-basic-200);
    border-color: var(--c-basic-400);
    color: var(--c-basic-700);
  }

  &--active {
    background: var(--c-support-100);
    border-color: var(--c-support-400);
    color: var(--c-support-400);
  }
}

.pm-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--fs-100);
  opacity: 0.4;
  transition: opacity 0.15s, background 0.15s;

  &:hover { opacity: 1; }

  &--flush {
    background: var(--c-basic-200);
    color: var(--c-basic-600);
  }

  &--delete {
    background: var(--c-negative-100);
    color: var(--c-negative-300);
  }
}

// --- Expand sub-table ---

$expand-cols: 80px 80px 110px 110px 1fr;

.pm-expand {
  border-top: 1px solid var(--c-basic-300);
  background: var(--c-basic-200);
  padding: 10px var(--space-200) 10px 56px;
}

.pm-expand__head {
  display: grid;
  grid-template-columns: $expand-cols;
  gap: var(--space-100);
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--c-basic-300);
  margin-bottom: 4px;
}

.pm-expand__row {
  display: grid;
  grid-template-columns: $expand-cols;
  gap: var(--space-100);
  padding: 4px 0;
  font-size: var(--fs-300);
  align-items: center;
  border-bottom: 1px solid var(--c-basic-200);

  &:last-child {
    border-bottom: none;
  }
}

@media only screen and (max-width: 768px) {
  .price-list__toolbar {
    padding: 0;
  }

  .price-list__search {
    max-width: 100%;
  }

  .pm-price-table__head,
  .pm-price-table__row {
    min-width: 900px;
  }

  .pm-price-table {
    overflow-x: auto;
  }
}
</style>
