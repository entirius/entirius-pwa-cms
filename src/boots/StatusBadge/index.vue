<template>
  <span class="status-badge" :class="`status-badge--${variant}`">
    {{ label }}
  </span>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    default: "neutral",
    validator: (v) =>
      ["positive", "negative", "warning", "informative", "neutral"].includes(v),
  },
});
</script>

<style lang="scss">
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: var(--fs-200);
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
  background: transparent;
  border: 1px solid var(--c-basic-300);
  color: var(--c-basic-700);

  // Small status dot replaces the old left bar — lighter, reads as premium.
  &::before {
    content: "";
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--c-basic-500);
  }

  &--positive {
    border-color: color-mix(in srgb, var(--c-positive-300) 32%, transparent);
    color: var(--c-positive-300);
    &::before {
      background: var(--c-positive-300);
    }
  }

  &--negative {
    border-color: color-mix(in srgb, var(--c-negative-300) 32%, transparent);
    color: var(--c-negative-300);
    &::before {
      background: var(--c-negative-300);
    }
  }

  &--warning {
    border-color: color-mix(in srgb, var(--c-warning-300) 38%, transparent);
    color: var(--c-warning-300);
    &::before {
      background: var(--c-warning-300);
    }
  }

  &--informative {
    border-color: color-mix(in srgb, var(--c-informative-200) 32%, transparent);
    color: var(--c-informative-200);
    &::before {
      background: var(--c-informative-200);
    }
  }

  &--neutral {
    border-color: var(--c-basic-300);
    color: var(--c-basic-600);
    &::before {
      background: var(--c-basic-500);
    }
  }
}
</style>
