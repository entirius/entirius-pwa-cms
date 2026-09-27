<template>
  <div ref="listRef" class="basic-tabs" role="tablist" @keydown="onKeydown">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="tab"
      class="basic-tabs__tab"
      :class="{ 'basic-tabs__tab--active': modelValue === option.value }"
      :aria-selected="String(modelValue === option.value)"
      :tabindex="isFocusTarget(option) ? 0 : -1"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
      <CountBadge v-if="option.count != null" :count="option.count" />
    </button>
  </div>
</template>

<script setup>
// Tabs of one screen (docs/ui-components.md § P3 display): a `tablist` with one Tab stop (the active tab); arrow
// keys, Home and End move to a tab and select it. Counts are CountBadges.
import { ref } from "vue";
import CountBadge from "@/boots/CountBadge/index.vue";

const props = defineProps({
  options: { type: Array, required: true },
  modelValue: { type: [String, Number], default: null },
});
const emit = defineEmits(["update:modelValue"]);
const listRef = ref(null);

const STEP = { ArrowRight: 1, ArrowLeft: -1 };

// Without a selected tab the first one takes the Tab stop.
function isFocusTarget(option) {
  const selected = props.options.some((o) => o.value === props.modelValue);
  return selected ? option.value === props.modelValue : option === props.options[0];
}

function targetIndex(key, current) {
  const last = props.options.length - 1;
  if (key === "Home") return 0;
  if (key === "End") return last;
  if (!STEP[key]) return null;
  return (current + STEP[key] + last + 1) % (last + 1);
}

function onKeydown(event) {
  const current = props.options.findIndex((o) => o.value === props.modelValue);
  const next = targetIndex(event.key, Math.max(current, 0));
  if (next === null) return;
  event.preventDefault();
  emit("update:modelValue", props.options[next].value);
  listRef.value?.querySelectorAll('[role="tab"]')[next]?.focus();
}
</script>

<style lang="scss">
// Wider than its box (a phone), the tab row scrolls inside itself instead of pushing the page sideways.
.basic-tabs {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
  border-bottom: 1px solid var(--border-subtle);

  &__tab {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    flex-shrink: 0;
    white-space: nowrap;
    padding: var(--space-2) var(--space-4);
    border: none;
    background: none;
    cursor: pointer;
    font-family: inherit;
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

    // The row scrolls, so it clips an outside ring: the focus ring sits inside the tab.
    &:focus-visible {
      outline-offset: -2px;
    }
  }
}
</style>
