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
.basic-tabs {
  display: flex;
  gap: var(--space-100);
  border-bottom: 1px solid var(--border-subtle);

  &__tab {
    padding: 8px 16px;
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
    padding: 0 6px;
    border-radius: 10px;
    background: var(--surface-raised);
    color: var(--text-secondary);
    font-size: var(--fs-100);
    font-weight: 600;
    margin-left: 4px;
  }
}
</style>
