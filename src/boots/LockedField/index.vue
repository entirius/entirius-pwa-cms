<template>
  <div class="locked-field relative">
    <label v-if="label" class="locked-field__label field-label block absolute">{{
      label
    }}</label>
    <div class="locked-field__value flex ai-ct gap-2">
      <FontAwesomeIcon icon="lock" class="locked-field__icon" />
      <span>{{ modelValue }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    default: "",
  },
  modelValue: {
    type: [String, Number],
    default: "",
  },
});
</script>

<style lang="scss" scoped>
.locked-field__label {
  top: calc(-1 * var(--label-gap));
  transform: translate(0, -100%);
}

.locked-field__value {
  height: var(--elem-height);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  background: var(--surface-raised);
  color: var(--text-muted);
  font-size: inherit;
}

.locked-field__icon {
  font-size: var(--fs-200);
  color: var(--text-muted);
}
</style>
