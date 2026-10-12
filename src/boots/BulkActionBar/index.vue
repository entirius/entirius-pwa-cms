<template>
  <div
    v-if="!readonly"
    class="bulk-bar bg-accent-subtle flex ai-ct jc-sb pl-10 pr-10 pt-5 pb-5"
  >
    <div class="flex ai-ct gap-8">
      <span class="fs-300 fw-600 t-accent">
        {{ count }} {{ $t(selectedLabelKey) }}
      </span>
      <template v-for="action in actions" :key="action.key">
        <BasicSelect
          v-if="action.options"
          :model-value="null"
          :options="action.options"
          :placeholder="$t(action.labelKey)"
          :aria-label="$t(action.labelKey)"
          class="bulk-bar__dropdown"
          @update:model-value="(val) => $emit('action', action.key, val)"
        />
        <BasicButton v-else :variant="action.variant ?? 'secondary'" @click="$emit('action', action.key)">
          {{ $t(action.labelKey) }}
        </BasicButton>
      </template>
    </div>
    <BasicButton variant="ghost" @click="$emit('clear')">
      {{ $t(clearLabelKey) }}
    </BasicButton>
  </div>
</template>

<script setup>
// actions = [{ key, labelKey, variant?, options? }]: `variant` is a BasicButton variant (default secondary); an action
// with `options` is an action picker (BasicSelect without a value of its own, `options` = [{ label, value }]). Not
// rendered on a read-only page (useReadonly, plan 19).
import { useReadonly } from "@/composables/useReadonly";

const readonly = useReadonly();

defineProps({
  count: {
    type: Number,
    required: true,
  },
  selectedLabelKey: {
    type: String,
    default: "common.bulk.items_selected",
  },
  clearLabelKey: {
    type: String,
    default: "common.bulk.clear_selection",
  },
  actions: {
    type: Array,
    required: true,
    validator: (value) =>
      value.every((a) => typeof a === "object" && typeof a.key === "string" && typeof a.labelKey === "string"),
  },
});

defineEmits(["action", "clear"]);
</script>

<style lang="scss" scoped>
.bulk-bar {
  border-radius: var(--radius-base);
  margin-bottom: var(--space-4);
}
.bulk-bar__dropdown {
  min-width: 180px;
}
</style>
