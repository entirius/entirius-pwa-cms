<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#pricing-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push('/pricing/channels')"
      />
      <span class="fw-600 fs-400">
        {{ isEdit ? (channel.name || channel.idx) : $t('pm.create_channel') }}
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
        <div class="pm-section">
          <h2 class="fs-500 fw-600 mb-300">{{ $t('pm.channel_detail') }}</h2>
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
            <div class="pm-field">
              <label class="pm-label">{{ $t('pm.calculate_direction') }}</label>
              <Dropdown
                :values="directionOptions"
                :selected="[form.calculate_direction]"
                @onSelect="(val) => form.calculate_direction = val[0]"
              />
            </div>
            <div class="pm-field">
              <label class="pm-label">{{ $t('pm.calculate_countries') }}</label>
              <Dropdown
                :custom_droplist="true"
                :placeholder="`${$t('pm.calculate_countries')} (${form.calculate_country_codes.length})`"
              >
                <template #custom>
                  <div
                    v-for="c in countryOptions"
                    :key="c.value"
                    class="pointer flex jc-sb ai-ct ph-100 dropdown-list-el"
                    :class="{ 'bg-primary-100': form.calculate_country_codes.includes(c.value) }"
                    @click.stop="toggleCountry(c.value)"
                  >
                    <span class="ml-100">{{ c.label }}</span>
                    <FontAwesomeIcon
                      v-if="form.calculate_country_codes.includes(c.value)"
                      icon="check"
                      class="t-positive-200"
                    />
                  </div>
                </template>
              </Dropdown>
            </div>
            <div class="pm-field">
              <label class="pm-label">{{ $t('pm.default_country') }}</label>
              <Dropdown
                :values="defaultCountryOptions"
                :selected="form.default_country_code ? [form.default_country_code] : []"
                :placeholder="$t('pm.select_default_country')"
                :isDisabled="!form.calculate_country_codes.length"
                @onSelect="(val) => form.default_country_code = val[0]"
              />
            </div>
          </div>
        </div>
      </template>
    </div>

    <Confirmation-modal
      :visible="showDeleteConfirm"
      @accept="deleteChannel"
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
  GET_PmChannel,
  POST_PmChannel,
  PATCH_PmChannel,
  DELETE_PmChannel,
  GET_PmTaxClasses,
  GET_PmTaxClass,
} from '@/api/pricemanager/api'

export default {
  name: 'PmChannelDetail',
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    const formErrors = useFormErrors()
    return { loader, notify, formErrors }
  },
  data() {
    return {
      channel: {},
      availableCountries: [],
      loading: false,
      showDeleteConfirm: false,
      form: {
        idx: '',
        name: '',
        calculate_direction: 'from_net_to_gross',
        calculate_country_codes: [],
        default_country_code: null,
      },
    }
  },
  computed: {
    isEdit() {
      return !!this.$route.params.idx
    },
    directionOptions() {
      return [
        { value: 'from_net_to_gross', label: this.$t('pm.from_net_to_gross') },
        { value: 'from_gross_to_net', label: this.$t('pm.from_gross_to_net') },
      ]
    },
    countryOptions() {
      return this.availableCountries.map((c) => ({
        value: c.iso2 || c.country,
        label: `${c.country_name || c.iso2 || c.country} (${c.iso2 || c.country})`,
      }))
    },
    defaultCountryOptions() {
      return this.form.calculate_country_codes.map((iso2) => {
        const c = this.availableCountries.find((ac) => (ac.iso2 || ac.country) === iso2)
        return {
          value: iso2,
          label: c ? `${c.country_name || iso2} (${iso2})` : iso2,
        }
      })
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
    this.fetchCountries()
    if (this.isEdit) this.fetch()
  },
  methods: {
    toggleCountry(iso2) {
      const idx = this.form.calculate_country_codes.indexOf(iso2)
      if (idx >= 0) {
        this.form.calculate_country_codes.splice(idx, 1)
        if (this.form.default_country_code === iso2) {
          this.form.default_country_code = null
        }
      } else {
        this.form.calculate_country_codes.push(iso2)
      }
    },
    async fetchCountries() {
      try {
        const { data: taxClasses } = await GET_PmTaxClasses()
        if (taxClasses.length) {
          const { data: detail } = await GET_PmTaxClass(taxClasses[0].idx)
          const seen = new Set()
          this.availableCountries = (detail.rates || []).filter((r) => {
            const key = r.country || r.iso2
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
        }
      } catch { /* countries stay empty, user can still type */ }
    },
    async fetch() {
      this.loading = true
      try {
        const { data } = await GET_PmChannel(this.$route.params.idx)
        this.channel = data
        this.form = {
          idx: data.idx,
          name: data.name,
          calculate_direction: data.calculate_direction || 'from_net_to_gross',
          // API returns calculate_countries: [{iso2, name}] and default_country: "PL"
          calculate_country_codes: (data.calculate_countries || []).map((c) => c.iso2),
          default_country_code: data.default_country || null,
        }
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
        const payload = {
          idx: this.form.idx,
          name: this.form.name,
          calculate_direction: this.form.calculate_direction,
          calculate_country_codes: this.form.calculate_country_codes,
          default_country_code: this.form.default_country_code || null,
        }
        if (this.isEdit) {
          await PATCH_PmChannel(this.$route.params.idx, payload)
          this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.success') })
          await this.fetch()
        } else {
          const { data } = await POST_PmChannel(payload)
          this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.success') })
          this.$router.push(`/pricing/channels/${data.idx}`)
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
    async deleteChannel() {
      this.showDeleteConfirm = false
      this.loader.loaderStart()
      try {
        await DELETE_PmChannel(this.$route.params.idx)
        this.notify.spawnNotification({ type: 'positive', msg: this.$t('notifications.deleted') })
        this.$router.push('/pricing/channels')
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

.pm-hint {
  font-size: var(--fs-200);
  color: var(--c-basic-500);
}
</style>
