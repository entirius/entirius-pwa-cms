<template>
  <div
    class="bulk-bar bg-accent-subtle flex ai-ct jc-sb pl-10 pr-10 pt-5 pb-5"
  >
    <div class="flex ai-ct gap-8">
      <span class="fs-300 fw-600 t-accent">
        {{ count }} {{ $t(selectedLabelKey) }}
      </span>
      <template v-for="action in actions" :key="action.key">
        <Dropdown
          v-if="action.options"
          :values="action.options"
          :placeholder="$t(action.labelKey)"
          class="bulk-bar__dropdown"
          @onSelect="(val) => $emit('action', action.key, val)"
        />
        <BasicButton
          v-else
          :text="$t(action.labelKey)"
          :class="action.buttonClass"
          @click="$emit('action', action.key)"
        />
      </template>
    </div>
    <BasicButton
      :text="$t(clearLabelKey)"
      class="bg-hover t-body"
      @click="$emit('clear')"
    />
  </div>
</template>

<script setup>
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
