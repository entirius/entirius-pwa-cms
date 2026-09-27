<template>
  <StatusBadge :tone="tone" :dot="false" :label="$t(featureTypeLabel(featureType))" />
</template>

<script setup>
import { computed } from "vue";
import { featureTypeLabel } from "../helpers/pimEnums";

const props = defineProps({
  featureType: {
    type: Number,
    required: true,
  },
});

// Per-type tone, hollow + colour-coded like every other badge.
const tone = computed(() => {
  const t = props.featureType;
  if (t === 7 || t === 8) return "accent"; // select
  if (t >= 3 && t <= 6) return "neutral"; // text
  if (t === 2 || (t >= 12 && t <= 14)) return "negative"; // number
  if (t === 1) return "positive"; // bool
  if (t === 10) return "warning"; // date
  return "neutral"; // json / fallback
});
</script>
