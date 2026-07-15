<template>
  <span class="chip" :class="colorClass">
    {{ $t(featureTypeLabel(featureType)) }}
  </span>
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

// Per-type hue carried as a `t-*` text utility — the global `.chip` derives its soft border from it
// (currentColor). Hollow + colour-coded, consistent with every other chip.
const colorClass = computed(() => {
  const t = props.featureType;
  if (t === 7 || t === 8) return "t-support-400"; // select
  if (t >= 3 && t <= 6) return "t-basic-700"; // text
  if (t === 2 || (t >= 12 && t <= 14)) return "t-negative-300"; // number
  if (t === 1) return "t-positive-300"; // bool
  if (t === 10) return "t-warning-300"; // date
  return "t-basic-600"; // json / fallback
});
</script>
