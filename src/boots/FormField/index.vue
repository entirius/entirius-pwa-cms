<template>
  <div class="form-field" :class="{ 'form-field--invalid': !!error }">
    <label
      v-if="label || tooltip"
      class="form-field__label"
      :class="{ required }"
    >
      <span v-if="label">{{ label }}</span>
      <HelpTooltip v-if="tooltip" :text="tooltip" />
    </label>
    <slot />
    <p v-if="error" class="form-field__error" role="alert">
      <span aria-hidden="true" class="form-field__error-icon">⚠</span>
      <span>{{ error }}</span>
    </p>
    <p v-else-if="description" class="form-field__desc">{{ description }}</p>
  </div>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  tooltip: {
    type: String,
    default: "",
  },
  required: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: "",
  },
});
</script>

<style lang="scss" scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field__label {
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.form-field__desc {
  font-size: var(--fs-200);
  color: var(--c-basic-500);
  margin: 0;
}

.form-field__error {
  font-size: var(--fs-200);
  color: var(--c-negative-300);
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-50);
}

.form-field__error-icon {
  font-size: 0.9em;
  line-height: 1;
}

.form-field--invalid :deep(input),
.form-field--invalid :deep(textarea),
.form-field--invalid :deep(.dropdown__trigger) {
  border-color: var(--c-negative-300);
}
</style>
