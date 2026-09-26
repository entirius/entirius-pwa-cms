<template>
  <div class="segmented-control">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :disabled="disabled"
      class="segmented-control__option"
      :class="{
        'segmented-control__option--active': modelValue === option.value,
      }"
      :data-testid="option.testid || null"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
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
  disabled: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["update:modelValue"]);
</script>

<style lang="scss">
.segmented-control {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 2px;
  background-color: var(--surface-raised);
  border-radius: var(--radius-full);
  gap: 2px;

  &__option {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0 var(--space-3);
    font-size: var(--fs-200);
    font-weight: 400;
    white-space: nowrap;
    border: none;
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(&--active) {
      color: var(--text-body);
    }

    &--active {
      background-color: var(--surface-base);
      color: var(--text-body);
      font-weight: 600;
      box-shadow: var(--shadow-sm);
    }

    &:disabled {
      cursor: default;
      opacity: 0.6;
    }
  }
}
</style>
