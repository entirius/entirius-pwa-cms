<template>
  <span
    class="status-badge"
    :class="`status-badge--${variant}`"
    :title="label"
  >
    <span class="status-badge__label">{{ label }}</span>
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
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--fs-200);
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
  // Never wider than its cell: a label that does not fit ends in an ellipsis (full label in `title`).
  max-width: 100%;
  min-width: 0;
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-body);

  // Small status dot replaces the old left bar — lighter, reads as premium.
  &::before {
    content: "";
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    flex-shrink: 0;
    background: var(--surface-disabled);
  }

  &__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &--positive {
    border-color: color-mix(in srgb, var(--positive) 32%, transparent);
    color: var(--positive);
    &::before {
      background: var(--positive-fill);
    }
  }

  &--negative {
    border-color: color-mix(in srgb, var(--negative) 32%, transparent);
    color: var(--negative);
    &::before {
      background: var(--negative-fill);
    }
  }

  &--warning {
    border-color: color-mix(in srgb, var(--warning) 38%, transparent);
    color: var(--warning);
    &::before {
      background: var(--warning-fill);
    }
  }

  &--informative {
    border-color: color-mix(in srgb, var(--info) 32%, transparent);
    color: var(--info);
    &::before {
      background: var(--info-fill);
    }
  }

  &--neutral {
    border-color: var(--border-subtle);
    color: var(--text-secondary);
    &::before {
      background: var(--surface-disabled);
    }
  }
}
</style>
