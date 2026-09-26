<template>
  <button
    class="filter-chip pointer"
    :class="{ 'filter-chip--active': active }"
    @click="$emit('click')"
  >
    {{ label }}
    <span v-if="count != null" class="filter-chip__count">{{ count }}</span>
  </button>
</template>

<script setup>
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

  &__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 var(--space-1);
    font-size: var(--fs-100);
    font-weight: 600;
    border-radius: var(--radius-full);
    background-color: var(--surface-hover);
    color: var(--text-secondary);
  }

  &--active &__count {
    background-color: rgba(255, 255, 255, 0.25);
    color: var(--text-on-accent-fill);
  }
}
</style>
