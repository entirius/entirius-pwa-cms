<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <div class="flex ai-ct jc-sb mb-400">
        <h1 class="fs-700 fw-600">{{ $t('pricefighter.strategies') }}</h1>
        <BasicButton
          :text="$t('pricefighter.new_rule')"
          icon="plus"
          class="bg-support-400 t-basic-100"
          @click="openCreate"
        />
      </div>

      <Loader v-show="loading" />

      <template v-if="!loading">
        <EmptyState
          v-if="!rules.length"
          :title="$t('pricefighter.no_rules')"
          :message="$t('pricefighter.no_rules_desc')"
          icon="scale-balanced"
        />

        <DataTable
          v-else
          :columns="columns"
          :rows="rules"
          row-key="id"
          :empty-text="$t('pricefighter.no_rules')"
          @row-click="openEdit"
        >
          <template #cell-scope="{ row }">
            <span class="fw-600">{{ scopeLabel(row) }}</span>
          </template>
          <template #cell-strategy="{ row }">
            <StatusBadge :label="$t(`pricefighter.recommendation_${row.strategy}`)" :variant="strategyVariant(row.strategy)" />
          </template>
          <template #cell-price_war="{ row }">
            <StatusBadge v-if="row.price_war" :label="$t('pricefighter.active')" variant="negative" />
            <span v-else class="t-basic-500">—</span>
          </template>
          <template #cell-mode="{ row }">
            {{ row.mode }}
          </template>
        </DataTable>
      </template>
    </div>

    <!-- Create/Edit modal -->
    <div v-if="editingRule !== null" class="rule-modal-backdrop" @click.self="closeModal">
      <div class="rule-modal">
        <h2 class="fs-500 fw-600 mb-400">
          {{ editingRule.id ? $t('pricefighter.edit_rule') : $t('pricefighter.new_rule') }}
        </h2>

        <FormField :label="$t('pricefighter.scope_type')" :tooltip="$t('pricefighter.scope_type_tooltip')" class="mb-300">
          <Dropdown
            :values="scopeTypeOptions"
            :selected="[form.scopeType]"
            @onSelect="onScopeTypeSelect"
          />
        </FormField>

        <FormField
          v-if="form.scopeType === 'sku'"
          :label="$t('pricefighter.sku')"
          :error="formErrors.getFieldError('sku')?.msg"
          class="mb-300"
        >
          <EntitySearchPicker
            :modelValue="form.scopeValue"
            :displayValue="form.scopeDisplay"
            :fetchFn="productFetch"
            :placeholder="$t('pricefighter.search_sku')"
            :disabled="pickerDisabled"
            @update:modelValue="form.scopeValue = $event"
            @update:displayValue="form.scopeDisplay = $event"
            @clear="form.scopeValue = ''; form.scopeDisplay = ''"
          />
        </FormField>
        <FormField
          v-else-if="form.scopeType === 'category_idx'"
          :label="$t('pricefighter.category')"
          :error="formErrors.getFieldError('category_idx')?.msg"
          class="mb-300"
        >
          <EntitySearchPicker
            :modelValue="form.scopeValue"
            :displayValue="form.scopeDisplay"
            :fetchFn="categoryFetch"
            :placeholder="$t('pricefighter.search_category')"
            :disabled="pickerDisabled"
            @update:modelValue="form.scopeValue = $event"
            @update:displayValue="form.scopeDisplay = $event"
            @clear="form.scopeValue = ''; form.scopeDisplay = ''"
          />
        </FormField>
        <FormField
          v-else
          :label="$t('pricefighter.market')"
          :tooltip="$t('pricefighter.market_tooltip')"
          :error="formErrors.getFieldError('channel')?.msg"
          class="mb-300"
        >
          <Dropdown
            :values="channelOptions"
            :selected="[form.scopeValue]"
            @onSelect="(v) => (form.scopeValue = v)"
          />
        </FormField>

        <FormField :label="$t('pricefighter.strategy')" :tooltip="$t('pricefighter.strategy_tooltip')" class="mb-300">
          <Dropdown
            :values="strategyOptions"
            :selected="[form.strategy]"
            @onSelect="(v) => (form.strategy = v)"
          />
        </FormField>

        <div class="flex ai-ct gap-300 mb-400">
          <Switcher
            :label="$t('pricefighter.price_war')"
            :selected="form.price_war"
            @onSelect="form.price_war = !form.price_war"
          />
          <Switcher
            :label="$t('pricefighter.mode_authoritative')"
            :hint="$t('pricefighter.mode_v2_note')"
            :selected="false"
            prevent
          />
        </div>

        <div class="flex ai-ct jc-sb gap-200">
          <BasicButton
            v-if="editingRule.id"
            text=""
            icon="trash-can"
            class="bg-negative-100 t-negative-300"
            @click="showDeleteConfirm = true"
          />
          <div v-else />
          <div class="flex ai-ct gap-200">
            <BasicButton
              :text="$t('common.cancel')"
              class="bg-basic-200 t-basic-600"
              @click="closeModal"
            />
            <BasicButton
              :text="$t('common.save')"
              class="bg-support-400 t-basic-100"
              @click="saveRule"
            />
          </div>
        </div>
      </div>
    </div>

    <Confirmation-modal
      :visible="showDeleteConfirm"
      @accept="deleteRule"
      @reject="showDeleteConfirm = false"
    >
      <template #header><h2>{{ $t('pricefighter.confirm_delete_title') }}</h2></template>
      <template #description><p>{{ $t('pricefighter.confirm_delete_rule') }}</p></template>
    </Confirmation-modal>
  </div>
</template>

<script>
import { useLoaderStore } from '@/stores/loader'
import { useNotifyStore } from '@/stores/notify'
import { useFormErrors, extractApiMessage } from '@/composables/useFormErrors'
import { usePfChannels } from '@/composables/usePfChannels'
import { useProductFetch, useCategoryFetch } from '@/composables/useEntityFetch'
import { useMuninStore } from '@/stores/munin'
import { GET_PfRules, POST_PfRule, PATCH_PfRule, DELETE_PfRule } from '@/api/pricefighter/api'
import { STRATEGIES, RECOMMENDATION_VARIANTS } from './constants'
import ConfirmationModal from '@/functionals/Confirmation-modal/index.vue'

const SCOPE_TYPES = ['sku', 'category_idx', 'channel']

function emptyForm() {
  return { scopeType: 'sku', scopeValue: '', scopeDisplay: '', strategy: 'hold', price_war: false }
}

export default {
  name: 'PfStrategies',
  components: { ConfirmationModal },
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    const formErrors = useFormErrors()
    const { channelOptions, fetchChannels } = usePfChannels()
    const munin = useMuninStore()
    return { loader, notify, formErrors, channelOptions, fetchChannels, munin }
  },
  data() {
    return {
      rules: [],
      loading: false,
      editingRule: null,
      showDeleteConfirm: false,
      form: emptyForm(),
    }
  },
  computed: {
    columns() {
      return [
        { key: 'scope', label: this.$t('pricefighter.scope'), sortable: false, width: '1.6fr' },
        { key: 'strategy', label: this.$t('pricefighter.strategy'), sortable: false, width: '1fr' },
        { key: 'price_war', label: this.$t('pricefighter.price_war'), sortable: false, width: '1fr' },
        { key: 'mode', label: this.$t('pricefighter.mode'), sortable: false, width: '0.8fr' },
      ]
    },
    strategyOptions() {
      return STRATEGIES.map((s) => ({
        value: s,
        label: this.$t(`pricefighter.recommendation_${s}`),
        description: this.$t(`pricefighter.recommendation_${s}_desc`),
      }))
    },
    scopeTypeOptions() {
      return SCOPE_TYPES.map((s) => ({ value: s, label: this.$t(`pricefighter.scope_${s}`) }))
    },
    // PIM channel to search products/categories in (SKUs are shared across channels,
    // so any synced channel works). Null when no channel is available.
    searchChannelIdx() {
      return this.channelOptions[0]?.value || null
    },
    // Graceful fallback: no PIM panel or no channel to query → EntitySearchPicker
    // renders a plain free-text input instead of a searchable list.
    pickerDisabled() {
      return !this.searchChannelIdx || !this.munin.isPanelEnabled('pim')
    },
    productFetch() {
      return useProductFetch(this.searchChannelIdx)
    },
    categoryFetch() {
      return useCategoryFetch(this.searchChannelIdx)
    },
  },
  async mounted() {
    await Promise.all([this.fetchRules(), this.fetchChannels()])
  },
  methods: {
    strategyVariant(strategy) {
      return RECOMMENDATION_VARIANTS[strategy] || 'neutral'
    },
    scopeLabel(row) {
      if (row.sku) return `${this.$t('pricefighter.scope_sku')}: ${row.sku}`
      if (row.category_idx) return `${this.$t('pricefighter.scope_category_idx')}: ${row.category_idx}`
      if (row.channel) return `${this.$t('pricefighter.scope_channel')}: ${row.channel}`
      return '—'
    },
    async fetchRules() {
      this.loading = true
      try {
        const { data } = await GET_PfRules({ page_size: 100 })
        this.rules = data.results || []
      } catch (err) {
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.error')),
        })
      } finally {
        this.loading = false
      }
    },
    onScopeTypeSelect(value) {
      this.form.scopeType = value
      this.form.scopeValue = ''
      this.form.scopeDisplay = ''
    },
    openCreate() {
      this.form = emptyForm()
      this.formErrors.clearErrors()
      this.editingRule = {}
    },
    openEdit(row) {
      this.editingRule = row
      const scopeType = row.sku ? 'sku' : row.category_idx ? 'category_idx' : 'channel'
      this.form = {
        scopeType,
        scopeValue: row[scopeType] || '',
        scopeDisplay: row[scopeType] || '',
        strategy: row.strategy,
        price_war: row.price_war,
      }
      this.formErrors.clearErrors()
    },
    closeModal() {
      this.editingRule = null
    },
    buildPayload() {
      const payload = { strategy: this.form.strategy, price_war: this.form.price_war }
      payload.sku = this.form.scopeType === 'sku' ? this.form.scopeValue : null
      payload.category_idx = this.form.scopeType === 'category_idx' ? this.form.scopeValue : null
      payload.channel = this.form.scopeType === 'channel' ? this.form.scopeValue : null
      return payload
    },
    async saveRule() {
      if (!this.form.scopeValue) {
        this.notify.spawnNotification({ type: 'negative', msg: this.$t('pricefighter.scope_value_required') })
        return
      }
      this.loader.loaderStart()
      try {
        const payload = this.buildPayload()
        if (this.editingRule.id) {
          await PATCH_PfRule(this.editingRule.id, payload)
        } else {
          await POST_PfRule(payload)
        }
        this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.success') })
        this.editingRule = null
        await this.fetchRules()
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
    async deleteRule() {
      this.showDeleteConfirm = false
      this.loader.loaderStart()
      try {
        await DELETE_PfRule(this.editingRule.id)
        this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.deleted') })
        this.editingRule = null
        await this.fetchRules()
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
.rule-modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay-heavy);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rule-modal {
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-lg);
  padding: 28px;
  min-width: min(420px, 95vw);
  max-width: 560px;
  width: 100%;
}
</style>
