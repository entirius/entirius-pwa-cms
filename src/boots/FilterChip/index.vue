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
  gap: 4px;
  height: 28px;
  padding: 0 0.75rem;
  font-size: 12px;
  border-radius: 50px;
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
    padding: 0 4px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 50px;
    background-color: var(--surface-hover);
    color: var(--text-secondary);
  }

  &--active &__count {
    background-color: rgba(255, 255, 255, 0.25);
    color: var(--c-basic-100);
  }
}
</style>
