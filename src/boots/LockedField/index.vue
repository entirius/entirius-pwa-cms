<template>
  <div class="locked-field relative">
    <label v-if="label" class="locked-field__label fs-200 block absolute">{{
      label
    }}</label>
    <div class="locked-field__value flex ai-ct gap-100">
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
  color: var(--text-secondary);
}

.locked-field__value {
  height: var(--elem-height);
  padding: 4px var(--space-100);
  border: 1px solid var(--border-subtle);
  border-radius: var(--space-50);
  background: var(--surface-raised);
  color: var(--text-muted);
  font-size: inherit;
}

.locked-field__icon {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
