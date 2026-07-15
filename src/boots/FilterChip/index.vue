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
  border: 1px solid var(--c-basic-400);
  background-color: var(--c-basic-100);
  color: var(--c-basic-700);
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--c-basic-500);
    background-color: var(--c-basic-200);
  }

  &--active {
    background-color: var(--c-support-400);
    border-color: var(--c-support-400);
    color: var(--c-basic-100);

    &:hover {
      filter: brightness(1.1);
      background-color: var(--c-support-400);
      border-color: var(--c-support-400);
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
    background-color: var(--c-basic-300);
    color: var(--c-basic-600);
  }

  &--active &__count {
    background-color: rgba(255, 255, 255, 0.25);
    color: var(--c-basic-100);
  }
}
</style>
