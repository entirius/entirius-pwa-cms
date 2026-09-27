<template>
  <div class="basic-tabs">
    <button
      v-for="option in options"
      :key="option.value"
      class="basic-tabs__tab"
      :class="{ 'basic-tabs__tab--active': modelValue === option.value }"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
      <span v-if="option.count != null" class="basic-tabs__count">{{
        option.count
      }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  options: {
    type: Array,
    required: true,
  },
  modelValue: {
    type: [String, Number],
    default: null,
  },
});

defineEmits(["update:modelValue"]);
</script>

<style lang="scss">
// Wider than its box (a phone), the tab row scrolls inside itself instead of pushing the page sideways.
.basic-tabs {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
  border-bottom: 1px solid var(--border-subtle);

  &__tab {
    flex-shrink: 0;
    white-space: nowrap;
    padding: var(--space-2) var(--space-4);
    border: none;
    background: none;
    cursor: pointer;
    font-size: var(--fs-300);
    font-weight: 500;
    color: var(--text-muted);
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;

    &:hover:not(&--active) {
      color: var(--text-body);
    }

    &--active {
      color: var(--text-accent);
      border-bottom-color: var(--accent);
    }
  }

  &__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 var(--space-1);
    border-radius: var(--radius-xl);
    background: var(--surface-raised);
    color: var(--text-secondary);
    font-size: var(--fs-100);
    font-weight: 600;
    margin-left: var(--space-1);
  }
}
</style>
