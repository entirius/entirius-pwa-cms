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
// Wider than its box (a phone), it scrolls inside itself with a thin bar instead of pushing the page sideways.
// Option height = control height minus the padding on both sides.
.segmented-control {
  --seg-height: 28px;
  --seg-pad: 2px;

  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  max-width: 100%;
  min-height: var(--seg-height);
  padding: var(--seg-pad);
  overflow-x: auto;
  scrollbar-width: thin;
  background-color: var(--surface-raised);
  border-radius: var(--radius-full);
  gap: 2px;

  &__option {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    height: calc(var(--seg-height) - 2 * var(--seg-pad));
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

    // The control scrolls, so it clips an outside ring: the focus ring sits inside the option.
    &:focus-visible {
      outline-offset: -2px;
    }
  }
}
</style>
