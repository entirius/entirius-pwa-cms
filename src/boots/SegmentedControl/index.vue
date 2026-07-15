<template>
  <div class="segmented-control">
    <button
      v-for="option in options"
      :key="option.value"
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
});

defineEmits(["update:modelValue"]);
</script>

<style lang="scss">
.segmented-control {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 2px;
  background-color: var(--c-basic-200);
  border-radius: 50px;
  gap: 2px;

  &__option {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0 0.75rem;
    font-size: 12px;
    font-weight: 400;
    white-space: nowrap;
    border: none;
    border-radius: 50px;
    background: transparent;
    color: var(--c-basic-600);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(&--active) {
      color: var(--c-basic-700);
    }

    &--active {
      background-color: var(--c-basic-100);
      color: var(--c-basic-800);
      font-weight: 600;
      box-shadow: var(--shadow-sm);
    }
  }
}
</style>
