<template>
  <div class="page-pad fs-300 t-body h-100 ov-h">
    <Teleport to="#pricing-toolbar-left" defer>
      <IconButton
        icon="back"
        :label="$t('common.back')"
        @click="$router.push('/pricing/tax-classes')"
      />
      <span class="fw-600 fs-400">
        {{ isEdit ? (taxClass.name || taxClass.idx) : $t('pm.create_tax_class') }}
      </span>
    </Teleport>
    <Teleport to="#pricing-toolbar-right" defer>
      <IconButton
        v-if="isEdit"
        icon="delete"
        :label="$t('common.delete')"
        variant="danger"
        @click="showDeleteConfirm = true"
      />
      <BasicButton
        variant="primary"
        @click="save"
      >
        {{ $t('pm.save') }}
      </BasicButton>
    </Teleport>

    <div class="page-card h-100 ovy-auto">
      <Loader block v-if="loading" />

      <template v-else>
        <!-- Basic fields -->
        <div class="pm-section mb-10">
          <h2 class="fs-500 fw-600 mb-8">{{ $t('pm.tax_class_detail') }}</h2>
          <div class="pm-grid">
            <div class="pm-field">
              <label class="field-label required">IDX</label>
              <BasicInput
                v-model="form.idx"
                :disabled="isEdit"
                :validate="formErrors.getFieldError('idx')"
              />
            </div>
            <div class="pm-field">
              <label class="field-label required">{{ $t('pm.name') }}</label>
              <BasicInput
                v-model="form.name"
                :validate="formErrors.getFieldError('name')"
              />
            </div>
          </div>
        </div>

        <!-- Rates table -->
        <div v-if="isEdit" class="pm-section">
          <div class="flex ai-ct jc-sb mb-8">
            <h2 class="fs-500 fw-600">{{ $t('pm.rate_count') }}</h2>
          </div>

          <div v-if="rates.length" class="pm-rates-table mb-8">
            <div class="pm-rates-table__head">
              <span>{{ $t('pm.country') }}</span>
              <span>{{ $t('pm.percent') }}</span>
              <span></span>
            </div>
            <div
              v-for="rate in rates"
              :key="rate.country"
              class="pm-rates-table__row"
            >
              <span class="fw-600">{{ rate.country }}</span>
              <span>{{ formatTaxRate(rate.rate) }}</span>
              <IconButton
                icon="delete"
                :label="$t('common.delete')"
                variant="danger"
                size="sm"
                @click="deleteRate(rate.country)"
              />
            </div>
          </div>

          <!-- Add rate row -->
          <div class="flex ai-st gap-5 flex-wrap">
            <BasicInput v-model="newRate.country_iso2" :placeholder="$t('pm.iso2_placeholder')" class="pm-rate-input" />
            <FormField :error="rateError" class="pm-rate-input">
              <NumberInput v-model="newRate.rate" :min="0" :max="100" :step="0.01" suffix="%" />
            </FormField>
            <BasicButton
              variant="secondary"
              @click="addRate"
            >
              {{ $t('pm.add_rate') }}
            </BasicButton>
          </div>
        </div>
      </template>
    </div>

    <ConfirmDialog
      tone="danger"
      :open="showDeleteConfirm"
      @confirm="deleteClass"
      @cancel="showDeleteConfirm = false"
      :title="$t('pm.confirm_delete_title')"
    >
      <template #default><p>{{ $t('pm.confirm_delete_msg') }}</p></template>
    </ConfirmDialog>
  </div>
</template>

<script>
import { useLoaderStore } from '@/stores/loader'
import { useNotifyStore } from '@/stores/notify'
import { useFormErrors, extractApiMessage } from '@/composables/useFormErrors'
import {
  GET_PmTaxClass,
  POST_PmTaxClass,
  PATCH_PmTaxClass,
  DELETE_PmTaxClass,
  POST_PmTaxRate,
  DELETE_PmTaxRate,
} from '@/api/pricemanager/api'
import { formatTaxRate, percentToRate } from '@/utils/taxRate'

export default {
  name: 'PmTaxClassDetail',
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    const formErrors = useFormErrors()
    return { loader, notify, formErrors }
  },
  data() {
    return {
      taxClass: {},
      rates: [],
      loading: false,
      showDeleteConfirm: false,
      form: { idx: '', name: '' },
      newRate: { country_iso2: '', rate: 0 },
      rateError: '',
    }
  },
  computed: {
    isEdit() {
      return !!this.$route.params.idx
    },
  },
  watch: {
    form: {
      deep: true,
      handler() {
        if (this.formErrors.hasErrors) this.formErrors.clearErrors()
      },
    },
    'newRate.rate'() {
      this.rateError = ''
    },
  },
  mounted() {
    if (this.isEdit) this.fetch()
  },
  methods: {
    formatTaxRate,
    async fetch() {
      this.loading = true
      try {
        const { data } = await GET_PmTaxClass(this.$route.params.idx)
        this.taxClass = data
        this.form = { idx: data.idx, name: data.name }
        this.rates = data.rates || []
      } catch (err) {
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.error')),
        })
      } finally {
        this.loading = false
      }
    },
    async save() {
      const valid = this.formErrors.validateRequired(this.form, {
        idx: 'IDX',
        name: this.$t('pm.name'),
      })
      if (!valid) return

      this.loader.loaderStart()
      try {
        if (this.isEdit) {
          await PATCH_PmTaxClass(this.$route.params.idx, { name: this.form.name })
          this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.success') })
          await this.fetch()
        } else {
          const { data } = await POST_PmTaxClass(this.form)
          this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.success') })
          this.$router.push(`/pricing/tax-classes/${data.idx}`)
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
    async addRate() {
      if (!this.newRate.country_iso2.trim()) return
      const rate = percentToRate(this.newRate.rate)
      if (rate === null || Number(rate) < 0 || Number(rate) > 1) {
        this.rateError = this.$t('pm.rate_range_error')
        return
      }
      this.loader.loaderStart()
      try {
        await POST_PmTaxRate(this.$route.params.idx, {
          country_code: this.newRate.country_iso2.trim().toUpperCase(),
          rate,
        })
        this.newRate = { country_iso2: '', rate: 0 }
        await this.fetch()
        this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.success') })
      } catch (err) {
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.save_error')),
        })
      } finally {
        this.loader.loaderFinish()
      }
    },
    async deleteRate(iso2) {
      this.loader.loaderStart()
      try {
        await DELETE_PmTaxRate(this.$route.params.idx, iso2)
        await this.fetch()
        this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.deleted') })
      } catch (err) {
        this.notify.spawnNotification({
          type: 'negative',
          msg: extractApiMessage(err, this.$t('notifications.error')),
        })
      } finally {
        this.loader.loaderFinish()
      }
    },
    async deleteClass() {
      this.showDeleteConfirm = false
      this.loader.loaderStart()
      try {
        await DELETE_PmTaxClass(this.$route.params.idx)
        this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.deleted') })
        this.$router.push('/pricing/tax-classes')
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
.pm-section {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  padding: var(--space-5);
}

.pm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-5);
}

.pm-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.pm-rates-table {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  overflow: hidden;
}

.pm-rates-table__head {
  display: grid;
  grid-template-columns: 1fr 1fr 40px;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-5);
  background: var(--surface-raised);
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
}

.pm-rates-table__row {
  display: grid;
  grid-template-columns: 1fr 1fr 40px;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-5);
  border-top: 1px solid var(--border-subtle);
  align-items: center;

  &:hover {
    background: var(--surface-raised);
  }
}

.pm-rate-input {
  width: 140px;
}
</style>
