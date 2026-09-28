<template>
  <DataTable :columns="columns" :rows="observations" :empty-text="$t('pricefighter.no_observations')">
    <template #cell-price="{ row }">
      {{ row.price }} {{ row.currency || '' }}
    </template>
    <template #cell-stock="{ row }">
      {{ row.stock != null ? row.stock : '—' }}
    </template>
    <template #cell-ts="{ row }">
      {{ formatDate(row.ts) }}
    </template>
    <template #cell-flag="{ row }">
      <StatusBadge
        :label="$t(`pricefighter.flag_${row.flag}`)"
        :tone="row.flag === 'valid' ? 'positive' : 'neutral'"
      />
    </template>
  </DataTable>
</template>

<script setup>
// Competitor observations of one decision: the gap row detail and a history entry's snapshot.
import { computed } from 'vue'
import { t } from '@/i18n'
import { formatDate } from '@/utils/format'

defineProps({
  observations: {
    type: Array,
    required: true,
  },
})

const columns = computed(() => [
  { key: 'source_idx', label: t('pricefighter.source'), width: '1.2fr' },
  { key: 'price', label: t('pricefighter.price'), width: '1fr', numeric: true },
  { key: 'stock', label: t('pricefighter.stock'), width: '0.6fr', numeric: true, priority: 2 },
  { key: 'ts', label: t('pricefighter.observed_at'), width: '1.2fr', priority: 2 },
  { key: 'flag', label: t('pricefighter.status'), width: 'max-content' },
])
</script>
