<template>
  <ConfirmationModal :visible="true" @reject="onClose">
    <template #header>
      <h2>{{ $t('pricefighter.apply_report_title') }}</h2>
    </template>
    <template #description>
      <div class="apply-report__body">
        <div class="apply-report__buckets">
          <StatusBadge
            v-for="bucket in buckets"
            :key="bucket.key"
            :label="`${$t(`pricefighter.${bucket.key}`)}: ${safeReport[bucket.key].length}`"
            :variant="bucket.variant"
          />
        </div>

        <div v-if="safeReport.stale.length" class="apply-report__stale-note">
          <FontAwesomeIcon icon="triangle-exclamation" class="mr-100" />
          {{ $t('pricefighter.stale_note') }}
        </div>

        <div v-for="bucket in buckets" :key="bucket.key" class="apply-report__bucket">
          <template v-if="safeReport[bucket.key].length">
            <h4 class="apply-report__bucket-heading">{{ $t(`pricefighter.${bucket.key}`) }}</h4>
            <table class="apply-report__table">
              <tbody>
                <tr v-for="(item, i) in safeReport[bucket.key]" :key="i">
                  <td>{{ item.sku }}</td>
                  <td>{{ item.channel }} · {{ item.country }} / {{ item.currency }}</td>
                  <td>{{ item.expected_new_price }}</td>
                  <td class="t-basic-500">{{ item.reason }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </div>

        <div class="apply-report__actions">
          <BasicButton :text="$t('common.close')" class="bg-support-400 t-basic-100" @click="onClose" />
        </div>
      </div>
    </template>
  </ConfirmationModal>
</template>

<script>
import ConfirmationModal from '@/functionals/Confirmation-modal/index.vue'

const BUCKETS = [
  { key: 'applied', variant: 'positive' },
  { key: 'clamped', variant: 'warning' },
  { key: 'skipped', variant: 'neutral' },
  { key: 'failed', variant: 'negative' },
  { key: 'stale', variant: 'negative' },
]

export default {
  name: 'ApplyReport',
  components: { ConfirmationModal },
  props: {
    report: {
      type: Object,
      required: true,
    },
  },
  emits: ['closed'],
  data() {
    return { buckets: BUCKETS }
  },
  computed: {
    // Defensive default — the API always returns all 5 buckets, but never trust the shape blindly.
    safeReport() {
      const r = this.report || {}
      return Object.fromEntries(BUCKETS.map((b) => [b.key, r[b.key] || []]))
    },
  },
  methods: {
    onClose() {
      this.$emit('closed')
    },
  },
}
</script>

<style lang="scss" scoped>
.apply-report__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
  max-width: 560px;
}

.apply-report__buckets {
  display: flex;
  gap: var(--space-100);
  flex-wrap: wrap;
}

.apply-report__stale-note {
  padding: var(--space-200);
  border-radius: var(--radius-sm);
  background: var(--c-negative-100);
  color: var(--c-negative-300);
  font-size: var(--fs-200);
}

.apply-report__bucket-heading {
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
  margin: 0 0 var(--space-100) 0;
}

.apply-report__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-200);

  td {
    padding: 4px 8px;
    border-bottom: 1px solid var(--c-basic-200);
  }
}

.apply-report__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
