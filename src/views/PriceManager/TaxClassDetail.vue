<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#pricing-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push('/pricing/tax-classes')"
      />
      <span class="fw-600 fs-400">
        {{ isEdit ? (taxClass.name || taxClass.idx) : $t('pm.create_tax_class') }}
      </span>
    </Teleport>
    <Teleport to="#pricing-toolbar-right" defer>
      <BasicButton
        v-if="isEdit"
        text=""
        icon="trash-can"
        class="bg-negative-100 t-negative-300"
        @click="showDeleteConfirm = true"
      />
      <BasicButton
        :text="$t('pm.save')"
        class="bg-support-400 t-basic-100"
        @click="save"
      />
    </Teleport>

    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <Loader v-if="loading" />

      <template v-else>
        <!-- Basic fields -->
        <div class="pm-section mb-400">
          <h2 class="fs-500 fw-600 mb-300">{{ $t('pm.tax_class_detail') }}</h2>
          <div class="pm-grid">
            <div class="pm-field">
              <label class="pm-label required">IDX</label>
              <BasicInput
                v-model="form.idx"
                :isDisabled="isEdit"
                :validate="formErrors.getFieldError('idx')"
              />
            </div>
            <div class="pm-field">
              <label class="pm-label required">{{ $t('pm.name') }}</label>
              <BasicInput
                v-model="form.name"
                :validate="formErrors.getFieldError('name')"
              />
            </div>
          </div>
        </div>

        <!-- Rates table -->
        <div v-if="isEdit" class="pm-section">
          <div class="flex ai-ct jc-sb mb-300">
            <h2 class="fs-500 fw-600">{{ $t('pm.rate_count') }}</h2>
          </div>

          <div v-if="rates.length" class="pm-rates-table mb-300">
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
              <span>{{ rate.rate }}%</span>
              <BasicButton
                text=""
                icon="trash-can"
                class="bg-negative-100 t-negative-300"
                @click="deleteRate(rate.country)"
              />
            </div>
          </div>

          <!-- Add rate row -->
          <div class="flex ai-ct gap-200 flex-wrap">
            <BasicInput v-model="newRate.country_iso2" placeholder="ISO2 (e.g. PL)" class="pm-rate-input" />
            <NumberInput v-model="newRate.rate" :min="0" :max="100" :step="0.01" suffix="%" class="pm-rate-input" />
            <BasicButton
              :text="$t('pm.add_rate')"
              icon="plus"
              class="bg-support-400 t-basic-100"
              @click="addRate"
            />
          </div>
        </div>
      </template>
    </div>

    <Confirmation-modal
      :visible="showDeleteConfirm"
      @accept="deleteClass"
      @reject="showDeleteConfirm = false"
    >
      <template #header><h2>{{ $t('pm.confirm_delete_title') }}</h2></template>
      <template #description><p>{{ $t('pm.confirm_delete_msg') }}</p></template>
    </Confirmation-modal>
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
  },
  mounted() {
    if (this.isEdit) this.fetch()
  },
  methods: {
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
      this.loader.loaderStart()
      try {
        // Backend expects decimal (0.2300), UI shows percentage (23)
        const rateDecimal = (Number(this.newRate.rate) / 100).toFixed(4)
        await POST_PmTaxRate(this.$route.params.idx, {
          country_code: this.newRate.country_iso2.trim().toUpperCase(),
          rate: rateDecimal,
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
  border: 1px solid var(--c-basic-200);
  border-radius: var(--radius-md);
  padding: 20px;
}

.pm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-200);
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

.pm-rates-table {
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.pm-rates-table__head {
  display: grid;
  grid-template-columns: 1fr 1fr 40px;
  gap: var(--space-100);
  padding: 8px var(--space-200);
  background: var(--c-basic-200);
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
}

.pm-rates-table__row {
  display: grid;
  grid-template-columns: 1fr 1fr 40px;
  gap: var(--space-100);
  padding: 8px var(--space-200);
  border-top: 1px solid var(--c-basic-300);
  align-items: center;

  &:hover {
    background: var(--c-basic-200);
  }
}

.pm-rate-input {
  width: 140px;
}
</style>
