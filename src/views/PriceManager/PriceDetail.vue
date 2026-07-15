<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport v-if="!embedded" to="#pricing-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push('/pricing/prices')"
      />
      <span class="fw-600 fs-400">{{ effectiveSku || $t('pm.price_detail') }}</span>
    </Teleport>

    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <Loader v-if="loading" />

      <template v-else>
        <EmptyState
          v-if="productNotFound"
          :title="$t('pm.no_price_for_product')"
          :message="$t('pm.no_price_for_product')"
          icon="tag"
        />

        <template v-else>
          <!-- Top bar: currency selector + meta info -->
          <div class="flex ai-ct gap-300 mb-400 flex-wrap">
            <div class="pm-field">
              <label class="pm-label">{{ $t('pm.currency') }}</label>
              <Dropdown
                :values="currencyOptions"
                :selected="activeCurrency ? [activeCurrency] : []"
                @onSelect="onCurrencyChange"
              />
            </div>
            <div class="pm-meta-item">
              <span class="pm-label">{{ $t('pm.country') }}</span>
              <span class="fw-600">{{ flatPrice?.country || defaultCountryIso || '—' }}</span>
            </div>
            <div class="pm-meta-item">
              <span class="pm-label">{{ $t('pm.direction') }}</span>
              <span>{{ isNetEditable ? $t('pm.from_net_to_gross') : $t('pm.from_gross_to_net') }}</span>
            </div>
            <div v-if="sourceBadge" class="pm-meta-item">
              <span class="pm-label">{{ $t('pm.source_label') }}</span>
              <span class="flex ai-ct gap-100">
                <StatusBadge :label="sourceBadge.label" :variant="sourceBadge.variant" />
              </span>
            </div>
            <div v-if="flatPurchaseCost" class="pm-meta-item">
              <span class="pm-label">{{ $t('pm.purchase_cost') }}</span>
              <span class="flex ai-ct gap-100">
                <span class="t-basic-700 fw-600">{{ flatPurchaseCost.net_cost }} {{ flatPurchaseCost.currency }}</span>
                <span v-if="flatPurchaseCost.supplier_idx" class="t-basic-500 fs-200">
                  · {{ flatPurchaseCost.supplier_idx }}
                </span>
                <StatusBadge
                  v-if="marginPercent !== null"
                  :label="$t('pm.margin_percent', { value: marginPercent })"
                  :variant="Number(marginPercent) > 0 ? 'positive' : 'negative'"
                />
                <span v-else-if="!flatPrice" class="t-warning-300 fs-200">{{ $t('pm.unpriced_hint') }}</span>
              </span>
            </div>
          </div>

          <!-- Editable row -->
          <div class="pm-edit-form mb-300">
            <div class="pm-edit-fields">
              <!-- Editable price (net or gross depending on direction) -->
              <div class="pm-field">
                <label class="pm-label required">
                  {{ isNetEditable ? $t('pm.net') : $t('pm.gross') }}
                </label>
                <BasicInput
                  v-model="form.value"
                  :validate="formErrors.getFieldError('value')"
                  @blur="form.value = normalizePrice(form.value)"
                />
              </div>

              <!-- Calculated price (read-only) -->
              <div class="pm-field">
                <label class="pm-label">
                  {{ isNetEditable ? $t('pm.gross') : $t('pm.net') }}
                  <span class="pm-lock-icon t-basic-400 ml-50">
                    <FontAwesomeIcon icon="lock" />
                  </span>
                </label>
                <div class="pm-readonly-value">
                  {{ flatPrice ? fmt2(isNetEditable ? flatPrice.gross : flatPrice.net) : '—' }}
                </div>
              </div>

              <!-- Special price -->
              <div class="pm-field">
                <label class="pm-label">{{ $t('pm.special_net') }}</label>
                <BasicInput
                  v-model="form.special_value"
                  :validate="formErrors.getFieldError('special_value')"
                  @blur="form.special_value = normalizePrice(form.special_value)"
                />
              </div>

              <!-- Promo dates -->
              <div class="pm-field">
                <label class="pm-label">{{ $t('pm.special_from') }}</label>
                <input
                  type="date"
                  class="pm-date-input"
                  :value="form.special_from_date"
                  @input="form.special_from_date = $event.target.value"
                />
              </div>
              <div class="pm-field">
                <label class="pm-label">{{ $t('pm.special_to') }}</label>
                <input
                  type="date"
                  class="pm-date-input"
                  :value="form.special_to_date"
                  @input="form.special_to_date = $event.target.value"
                />
              </div>
            </div>
          </div>

          <!-- Actions row -->
          <div class="flex gap-200 mb-400 flex-wrap ai-ct">
            <BasicButton
              :text="$t('pm.save')"
              class="bg-support-400 t-basic-100"
              @click="save"
            />
            <BasicButton
              :text="showCountries ? $t('pm.hide_countries') : $t('pm.view_all_countries')"
              class="btn-outline"
              @click="showCountries = !showCountries"
            />
            <BasicButton
              :text="showHistory ? $t('pm.hide_history') : $t('pm.view_history')"
              class="btn-outline"
              @click="toggleHistory"
            />
            <span :title="$t('pm.flush_special_tooltip')">
              <BasicButton
                text=""
                icon="broom"
                class="bg-basic-200 t-basic-600"
                @click="showFlushConfirm = true"
              />
            </span>
            <span :title="$t('pm.delete_prices_tooltip')">
              <BasicButton
                text=""
                icon="trash-can"
                class="bg-negative-100 t-negative-300"
                @click="showDeleteConfirm = true"
              />
            </span>
          </div>

          <!-- Confirmation modals -->
          <Confirmation-modal
            :visible="showFlushConfirm"
            @accept="flushSpecial"
            @reject="showFlushConfirm = false"
          >
            <template #header><h2>{{ $t('pm.flush_special') }}</h2></template>
            <template #description><p>{{ $t('pm.flush_special_confirm') }}</p></template>
          </Confirmation-modal>

          <Confirmation-modal
            :visible="showDeleteConfirm"
            @accept="deletePrices"
            @reject="showDeleteConfirm = false"
          >
            <template #header><h2>{{ $t('pm.delete_prices') }}</h2></template>
            <template #description><p>{{ $t('pm.delete_prices_confirm') }}</p></template>
          </Confirmation-modal>

          <!-- All-countries breakdown (collapsible) -->
          <div v-if="showCountries" class="mb-400">
            <h3 class="fs-400 fw-600 mb-200 t-basic-600">{{ $t('pm.all_countries') }}</h3>
            <div class="pm-country-table">
              <div class="pm-country-table__head">
                <span>{{ $t('pm.country') }}</span>
                <span>{{ $t('pm.currency') }}</span>
                <span>{{ $t('pm.tax_rate') }}</span>
                <span>{{ $t('pm.net') }}</span>
                <span>{{ $t('pm.gross') }}</span>
                <span>{{ $t('pm.special') }}</span>
              </div>
              <div
                v-for="row in filteredCountries"
                :key="row.country"
                class="pm-country-table__row"
              >
                <span class="fw-600">{{ row.country }}</span>
                <span>{{ row.currency }}</span>
                <span>{{ row.tax_rate }}</span>
                <span>{{ fmt2(row.net) }}</span>
                <span>{{ fmt2(row.gross) }}</span>
                <span class="t-basic-500">
                  {{ fmt2(row.special_net) || '—' }}
                  <template v-if="row.special_gross"> → {{ fmt2(row.special_gross) }}</template>
                </span>
              </div>
            </div>
          </div>

          <!-- History (collapsible) -->
          <div v-if="showHistory" class="mt-200">
            <h3 class="fs-400 fw-600 mb-200">{{ $t('pm.history') }}</h3>
            <Loader v-if="historyLoading" />
            <div v-else-if="!history.length" class="t-basic-500 fs-200">—</div>
            <div
              v-for="entry in history"
              :key="entry.id"
              class="pm-history-row flex ai-ct gap-200"
            >
              <span class="t-basic-500 fs-200">{{ entry.created_at }}</span>
              <span class="fw-600">{{ entry.country }}</span>
              <span>{{ entry.source }} — gross: {{ entry.gross_value }}, net: {{ entry.net_value }}</span>
              <span class="t-basic-500 fs-200">{{ entry.changed_by }}</span>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from '@/stores/loader'
import { useNotifyStore } from '@/stores/notify'
import { useFormErrors, extractApiMessage } from '@/composables/useFormErrors'
import { GET_PmPriceDetail, GET_PmPrices, PATCH_PmPrice, DELETE_PmPrice, POST_PmFlushSpecial, GET_PmPriceHistory } from '@/api/pricemanager/api'
import ConfirmationModal from '@/functionals/Confirmation-modal/index.vue'

export default {
  name: 'PmPriceDetail',
  components: { ConfirmationModal },
  inject: {
    pmChannelIdx: { default: null },
    pmActiveChannel: { default: null },
  },
  props: {
    sku: { type: String, default: null },
    channelIdxProp: { type: String, default: null },
    embedded: { type: Boolean, default: false },
  },
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    const formErrors = useFormErrors()
    return { loader, notify, formErrors }
  },
  data() {
    return {
      allCountries: [],
      purchaseCosts: [],
      loading: false,
      productNotFound: false,
      showCountries: false,
      showHistory: false,
      showFlushConfirm: false,
      showDeleteConfirm: false,
      historyLoading: false,
      history: [],
      activeCurrency: '',
      availableCurrencies: [],
      form: {
        value: '',
        special_value: '',
        special_from_date: null,
        special_to_date: null,
      },
    }
  },
  computed: {
    effectiveSku() {
      return this.sku || this.$route?.params?.sku || ''
    },
    effectiveChannelIdx() {
      if (this.channelIdxProp) return this.channelIdxProp
      const v = this.pmChannelIdx
      return (typeof v === 'object' && v !== null) ? (v.value || '') : (v || '')
    },
    isNetEditable() {
      const ch = this.pmActiveChannel
      const obj = (typeof ch === 'object' && ch !== null && 'value' in ch) ? ch.value : ch
      return (obj?.calculate_direction || 'from_net_to_gross') === 'from_net_to_gross'
    },
    defaultCountryIso() {
      const ch = this.pmActiveChannel
      const obj = (typeof ch === 'object' && ch !== null && 'value' in ch) ? ch.value : ch
      return obj?.default_country || ''
    },
    flatPrice() {
      if (!this.allCountries.length || !this.activeCurrency) return null
      const rows = this.allCountries.filter((r) => r.currency === this.activeCurrency)
      if (!rows.length) return null
      const dc = this.defaultCountryIso
      if (dc) {
        const match = rows.find((r) => r.country === dc)
        if (match) return match
      }
      return rows[0]
    },
    filteredCountries() {
      if (!this.activeCurrency) return this.allCountries
      return this.allCountries.filter((r) => r.currency === this.activeCurrency)
    },
    flatPurchaseCost() {
      // Purchase cost is in the supplier's currency and is INDEPENDENT of the sell-price
      // currency selector — show it regardless of activeCurrency (no 1:1 relation).
      if (!this.purchaseCosts.length) return null
      const dc = this.defaultCountryIso
      if (dc) {
        const match = this.purchaseCosts.find((r) => r.country === dc)
        if (match) return match
      }
      return this.purchaseCosts[0]
    },
    marginPercent() {
      // Margin only makes sense when sell and cost share a currency (no FX conversion here).
      const pc = this.flatPurchaseCost
      const price = this.flatPrice
      if (!pc || !price || price.currency !== pc.currency) return null
      const net = Number(price.net)
      const cost = Number(pc.net_cost)
      if (!net || Number.isNaN(net) || Number.isNaN(cost)) return null
      return (((net - cost) / net) * 100).toFixed(1)
    },
    currencyOptions() {
      return this.availableCurrencies.map((code) => ({ value: code, label: code }))
    },
    sourceBadge() {
      const src = this.flatPrice?.source
      if (!src) return null
      const labels = {
        admin_edit: { key: 'pm.source_admin_edit', variant: 'neutral' },
        csv_import: { key: 'pm.source_csv_import', variant: 'neutral' },
        api: { key: 'pm.source_api', variant: 'neutral' },
        generation: { key: 'pm.source_generation', variant: 'neutral' },
        tax_rate_change: { key: 'pm.source_tax_rate_change', variant: 'neutral' },
        migration: { key: 'pm.source_migration', variant: 'neutral' },
        migration_backfill: { key: 'pm.source_migration', variant: 'neutral' },
      }
      const entry = labels[src]
      if (!entry) return { label: src, variant: 'neutral' }
      return { label: this.$t(entry.key), variant: entry.variant }
    },
  },
  watch: {
    effectiveChannelIdx(val) {
      if (val && this.effectiveSku) this.fetchDetail()
    },
    form: {
      deep: true,
      handler() {
        if (this.formErrors.hasErrors) this.formErrors.clearErrors()
      },
    },
  },
  mounted() {
    if (this.effectiveChannelIdx && this.effectiveSku) this.fetchDetail()
  },
  methods: {
    async fetchDetail() {
      this.loading = true
      this.productNotFound = false
      try {
        const { data } = await GET_PmPriceDetail(this.effectiveChannelIdx, this.effectiveSku)
        const countries = data.prices || data.countries || data.results || []
        this.allCountries = countries
        this.purchaseCosts = data.purchase_costs || []

        // Extract currencies from existing prices + purchase costs, then merge with channel currencies.
        // Including purchase-cost currencies means an unpriced product still surfaces its cost.
        const existingCurrencies = new Set(countries.map((r) => r.currency).filter(Boolean))
        this.purchaseCosts.forEach((pc) => pc.currency && existingCurrencies.add(pc.currency))
        await this.fetchChannelCurrencies()
        // Merge: existing first (for this product), then any other channel currencies
        const merged = new Set([...existingCurrencies, ...this.availableCurrencies])
        this.availableCurrencies = [...merged]

        if (this.availableCurrencies.length) {
          if (!this.activeCurrency || !this.availableCurrencies.includes(this.activeCurrency)) {
            this.activeCurrency = this.availableCurrencies[0]
          }
        }
        this.syncFormToPrice()
      } catch (err) {
        if (err?.response?.status === 404 || err?.error === 'NOT_FOUND') {
          this.productNotFound = true
        } else {
          this.notify.spawnNotification({
            type: 'negative',
            msg: extractApiMessage(err, this.$t('notifications.error')),
          })
        }
      } finally {
        this.loading = false
      }
    },
    async fetchChannelCurrencies() {
      try {
        const { data } = await GET_PmPrices(this.effectiveChannelIdx, { page_size: 100 })
        const results = data.results || []
        const seen = new Set()
        results.forEach((p) => {
          const countries = p.countries || []
          countries.forEach((c) => { if (c.currency) seen.add(c.currency) })
          if (p.currency) seen.add(p.currency)
        })
        this.availableCurrencies = [...seen].sort()
        if (this.availableCurrencies.length && !this.activeCurrency) {
          this.activeCurrency = this.availableCurrencies[0]
        }
      } catch {
        // silent — currencies dropdown will be empty
      }
    },
    normalizePrice(val) {
      if (!val) return val
      const s = String(val).replace(',', '.').trim()
      const num = Number(s)
      if (isNaN(num) || num < 0) return s
      return num.toFixed(2)
    },
    fmt2(val) {
      if (val == null || val === '') return ''
      const num = Number(val)
      return isNaN(num) ? '' : num.toFixed(2)
    },
    syncFormToPrice() {
      const price = this.flatPrice
      if (price) {
        this.form.value = this.fmt2(this.isNetEditable ? price.net : price.gross)
        this.form.special_value = this.fmt2(price.special_net || price.special_gross)
        this.form.special_from_date = price.special_from_date || null
        this.form.special_to_date = price.special_to_date || null
      } else {
        this.form.value = ''
        this.form.special_value = ''
        this.form.special_from_date = null
        this.form.special_to_date = null
      }
    },
    onCurrencyChange(selected) {
      this.activeCurrency = Array.isArray(selected) ? selected[0] : selected
      this.syncFormToPrice()
    },
    async toggleHistory() {
      this.showHistory = !this.showHistory
      if (this.showHistory && !this.history.length) await this.fetchHistory()
    },
    async fetchHistory() {
      this.historyLoading = true
      try {
        const { data } = await GET_PmPriceHistory(this.effectiveChannelIdx, this.effectiveSku)
        this.history = data.results || data || []
      } catch {
        this.history = []
      } finally {
        this.historyLoading = false
      }
    },
    async save() {
      const valid = this.formErrors.validateRequired(this.form, {
        value: this.isNetEditable ? this.$t('pm.net') : this.$t('pm.gross'),
      })
      if (!valid) return

      this.loader.loaderStart()
      try {
        const value = String(this.form.value).replace(',', '.').trim()
        const specialRaw = this.form.special_value ? String(this.form.special_value).replace(',', '.').trim() : ''
        const payload = {
          value,
          currency_code: this.activeCurrency || this.flatPrice?.currency || 'EUR',
        }
        // Send special_value: null to explicitly clear promo, or the value if set
        const hadSpecial = this.flatPrice?.special_net || this.flatPrice?.special_gross
        if (specialRaw) {
          payload.special_value = specialRaw
        } else if (hadSpecial) {
          payload.special_value = null
        }
        if (this.form.special_from_date) payload.special_from_date = this.form.special_from_date
        if (this.form.special_to_date) payload.special_to_date = this.form.special_to_date

        await PATCH_PmPrice(this.effectiveChannelIdx, this.effectiveSku, payload)
        this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.success') })
        await this.fetchDetail()
        if (this.showHistory) {
          this.history = []
          await this.fetchHistory()
        }
      } catch (err) {
        this.formErrors.handleApiError(err)
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.save_error')),
        })
      } finally {
        this.loader.loaderFinish()
      }
    },
    async flushSpecial() {
      this.showFlushConfirm = false
      this.loader.loaderStart()
      try {
        await POST_PmFlushSpecial(this.effectiveChannelIdx, this.effectiveSku, this.activeCurrency)
        this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.success') })
        await this.fetchDetail()
      } catch (err) {
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.error')),
        })
      } finally {
        this.loader.loaderFinish()
      }
    },
    async deletePrices() {
      this.showDeleteConfirm = false
      this.loader.loaderStart()
      try {
        await DELETE_PmPrice(this.effectiveChannelIdx, this.effectiveSku, this.activeCurrency)
        this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.success') })
        await this.fetchDetail()
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
.pm-edit-form {
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  padding: 20px;
  background: var(--c-basic-100);
}

.pm-edit-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-200);
  align-items: end;
}

.pm-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pm-label {
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
}

.pm-lock-icon {
  font-size: var(--fs-100);
}

.pm-readonly-value {
  height: var(--elem-height);
  display: flex;
  align-items: center;
  padding: 0 var(--space-100);
  background: var(--c-basic-200);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-sm);
  color: var(--c-basic-600);
  font-size: var(--fs-300);
}

.pm-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pm-country-table {
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.pm-country-table__head {
  display: grid;
  grid-template-columns: 60px 60px 70px 1fr 1fr 1fr;
  gap: var(--space-100);
  padding: 8px var(--space-200);
  background: var(--c-basic-200);
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
}

.pm-country-table__row {
  display: grid;
  grid-template-columns: 60px 60px 70px 1fr 1fr 1fr;
  gap: var(--space-100);
  padding: 8px var(--space-200);
  border-top: 1px solid var(--c-basic-300);
  align-items: center;
}

.pm-history-row {
  padding: 8px var(--space-200);
  border-bottom: 1px solid var(--c-basic-300);
  font-size: var(--fs-200);
}

.pm-date-input {
  height: var(--elem-height);
  padding: 0 var(--space-100);
  border: 1px solid var(--c-basic-400);
  border-radius: var(--radius-sm);
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  font-size: var(--fs-300);
  font-family: inherit;

  &::-webkit-calendar-picker-indicator {
    filter: var(--calendar-icon-filter, none);
  }
}

[data-theme="dark"] .pm-date-input {
  color-scheme: dark;
}
</style>
