<template>
  <ConfirmationModal :visible="true" @reject="onCancel">
    <template #header>
      <h2>{{ $t('pricefighter.apply_preview_title', { count: items.length }) }}</h2>
    </template>
    <template #description>
      <div class="apply-preview__body">
        <table class="apply-preview__table">
          <thead>
            <tr>
              <th>{{ $t('pricefighter.sku') }}</th>
              <th>{{ $t('pricefighter.market') }}</th>
              <th>{{ $t('pricefighter.current_price') }}</th>
              <th>{{ $t('pricefighter.suggested_price') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item._rowKey">
              <td>{{ item.sku }}</td>
              <td>{{ item.channel_idx }} · {{ item.country }} / {{ item.currency }}</td>
              <td>{{ item.current_price }}</td>
              <td class="fw-600">{{ item.suggested_price }}</td>
              <td>
                <StatusBadge v-if="item.clamped_floor" :label="$t('pricefighter.clamped_floor')" variant="warning" />
                <StatusBadge v-if="item.clamped_step" :label="$t('pricefighter.clamped_step')" variant="warning" />
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="errorText" class="apply-preview__error t-negative-300 fs-200">
          <FontAwesomeIcon icon="triangle-exclamation" class="mr-100" />
          {{ errorText }}
        </div>

        <div class="apply-preview__actions">
          <BasicButton
            :text="$t('common.cancel')"
            class="bg-basic-200 t-basic-600"
            :disabled="loading"
            @click="onCancel"
          />
          <BasicButton
            :text="loading ? $t('pricefighter.applying') : $t('pricefighter.confirm_apply')"
            class="bg-support-400 t-basic-100"
            :disabled="loading || !items.length"
            @click="onConfirm"
          />
        </div>
      </div>
    </template>
  </ConfirmationModal>
</template>

<script>
import ConfirmationModal from '@/functionals/Confirmation-modal/index.vue'
import { POST_PfApply } from '@/api/pricefighter/api'
import { extractApiMessage } from '@/composables/useFormErrors'

export default {
  name: 'ApplyPreviewModal',
  components: { ConfirmationModal },
  props: {
    items: {
      type: Array,
      required: true,
    },
  },
  emits: ['applied', 'cancelled'],
  data() {
    return {
      loading: false,
      errorText: '',
    }
  },
  methods: {
    onCancel() {
      if (this.loading) return
      this.$emit('cancelled')
    },
    async onConfirm() {
      if (this.loading || !this.items.length) return
      this.loading = true
      this.errorText = ''
      try {
        const payload = {
          items: this.items.map((item) => ({
            sku: item.sku,
            market: { channel: item.channel_idx, country: item.country, currency: item.currency },
            expected_new_price: item.suggested_price,
          })),
        }
        const { data } = await POST_PfApply(payload)
        this.$emit('applied', data)
      } catch (err) {
        this.errorText = extractApiMessage(err, this.$t('notifications.save_error'))
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.apply-preview__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
}

.apply-preview__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-200);
  max-height: 320px;

  th {
    text-align: left;
    padding: 4px 8px;
    color: var(--c-basic-500);
    text-transform: uppercase;
    font-size: var(--fs-100);
    border-bottom: 1px solid var(--c-basic-300);
  }

  td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--c-basic-200);
  }
}

.apply-preview__error {
  padding: var(--space-200);
  border-radius: var(--radius-sm);
  background: var(--c-negative-100);
  border-left: 3px solid var(--c-negative-300);
}

.apply-preview__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-200);
  margin-top: var(--space-200);
}
</style>
