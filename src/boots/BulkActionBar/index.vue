<template>
  <div
    class="bulk-bar bg-support-100 flex ai-ct jc-sb pl-400 pr-400 pt-200 pb-200"
  >
    <div class="flex ai-ct gap-300">
      <span class="fs-300 fw-600 t-support-400">
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
      class="bg-basic-300 t-basic-700"
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
  border-radius: 6px;
  margin-bottom: 16px;
}
.bulk-bar__dropdown {
  min-width: 180px;
}
</style>
