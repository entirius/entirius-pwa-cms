<template>
  <button
    type="button"
    class="filter-chip pointer"
    :class="{ 'filter-chip--active': active }"
    @click="$emit('click')"
  >
    {{ label }}
    <CountBadge v-if="count != null" :count="count" />
  </button>
</template>

<script setup>
import CountBadge from "@/boots/CountBadge/index.vue";

defineProps({
  label: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
  count: {
    type: Number,
    default: null,
  },
});

defineEmits(["click"]);
</script>

<style lang="scss">
@import "@/assets/scss/utils/touch-target";

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: 28px;
  padding: 0 var(--space-3);
  font-size: var(--fs-200);
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  background-color: var(--surface-base);
  color: var(--text-body);
  white-space: nowrap;
  transition: all 0.15s ease;

  // Wrapped chip rows sit 8 px apart: the hit area is 40 wide and 36 high (28 + the gap), so rows never overlap.
  @include touch-target(var(--space-10), 36px);

  &:hover {
    border-color: var(--border-default);
    background-color: var(--surface-raised);
  }

  &--active {
    background-color: var(--accent-fill);
    border-color: var(--accent);
    color: var(--text-on-accent-fill);

    &:hover {
      filter: brightness(1.1);
      background-color: var(--accent-fill);
      border-color: var(--accent);
    }
  }
}
</style>
