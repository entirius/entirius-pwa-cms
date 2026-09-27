<template>
  <button
    :type="type"
    class="icon-button inline-flex jc-ct ai-ct pointer"
    :class="[`icon-button--${variant}`, `icon-button--${size}`]"
    :disabled="disabled"
    :aria-label="label"
    :aria-pressed="pressed === undefined ? undefined : String(pressed)"
    :title="label"
    @click="onClick"
  >
    <FontAwesomeIcon :icon="ICONS[icon]" aria-hidden="true" />
  </button>
</template>

<script setup>
// Every icon-only action (docs/ui-rules.md C5, R7): `icon` is a meaning of icons.js, `label` its accessible name
// (aria-label + title until BasicTooltip, plan 12). Sizes: sm 24, md --elem-height (lines up with a text button in
// an ActionBar), lg 40 (header, mobile menu). `danger` is every icon-only delete/remove (C6). `pressed` makes it a
// toggle (aria-pressed). The click stops at the button, as BasicButton's does (rows and cards may act on a click).
import { ICONS } from "@/boots/Icons/icons";

const props = defineProps({
  icon: { type: String, required: true, validator: (value) => Object.hasOwn(ICONS, value) },
  label: { type: String, required: true },
  variant: {
    type: String,
    default: "ghost",
    validator: (value) => ["ghost", "outline", "primary", "danger"].includes(value),
  },
  size: { type: String, default: "md", validator: (value) => ["sm", "md", "lg"].includes(value) },
  pressed: { type: Boolean, default: undefined },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: "button" },
  stop: { type: Boolean, default: true },
});
const emit = defineEmits(["click"]);

function onClick(event) {
  if (props.stop) event.stopPropagation();
  emit("click");
}
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.icon-button {
  --icon-button-size: var(--elem-height);

  position: relative;
  box-sizing: border-box;
  flex-shrink: 0;
  width: var(--icon-button-size);
  height: var(--icon-button-size);
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-base);
  color: var(--text-secondary);
  background-color: transparent;
  font-size: var(--fs-400);

  &[disabled] {
    color: var(--text-muted);
    cursor: not-allowed;
  }
}

.icon-button--sm {
  --icon-button-size: var(--space-6);

  font-size: var(--fs-300);
}

.icon-button--lg {
  --icon-button-size: var(--space-10);

  border-radius: var(--radius-xl);
  font-size: var(--fs-500);
}

.icon-button--ghost:hover:not([disabled]),
.icon-button[aria-pressed="true"] {
  color: var(--text-body);
  background-color: var(--surface-hover);
}

.icon-button--outline {
  border-color: var(--border-default);

  &:hover:not([disabled]) {
    color: var(--text-body);
    border-color: var(--border-strong);
  }
}

.icon-button--danger {
  color: var(--negative);

  &:hover:not([disabled]) {
    border-color: var(--negative);
  }
}

.icon-button--primary {
  color: var(--text-on-accent-fill);
  background-color: var(--accent-fill);

  &:hover:not([disabled]) {
    background-color: var(--accent-fill-hover);
  }

  &[disabled] {
    background-color: var(--accent-fill-hover);
  }
}

// A thumb-sized hit area on touch screens without a bigger box: the pseudo-element takes the taps around the button.
@include max-tablet {
  .icon-button::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: max(100%, var(--space-10));
    height: max(100%, var(--space-10));
    transform: translate(-50%, -50%);
  }
}
</style>
