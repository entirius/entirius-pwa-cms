<template>
  <div class="array-diff">
    <div class="array-diff__summary">
      <span v-if="addedCount > 0" class="t-positive-300">
        {{ $t("pim.supplier.diff.added", { count: addedCount }) }}
      </span>
      <span v-if="removedCount > 0" class="t-negative-300">
        {{ $t("pim.supplier.diff.removed", { count: removedCount }) }}
      </span>
      <span v-if="addedCount === 0 && removedCount === 0" class="t-basic-500">
        {{ $t("pim.supplier.diff.no_change") }}
      </span>
    </div>
    <button
      v-if="addedItems.length + removedItems.length > 0"
      class="array-diff__toggle"
      @click="expanded = !expanded"
    >
      {{ expanded ? $t("pim.supplier.timeline.hide_diff") : $t("pim.supplier.timeline.show_diff") }}
    </button>
    <div v-if="expanded" class="array-diff__details">
      <ul v-if="addedItems.length" class="array-diff__list">
        <li v-for="(item, i) in addedItems" :key="`a-${i}`" class="t-positive-300">+ {{ item }}</li>
      </ul>
      <ul v-if="removedItems.length" class="array-diff__list">
        <li v-for="(item, i) in removedItems" :key="`r-${i}`" class="t-negative-300">− {{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: "ArrayDiff",
  props: {
    before: { type: Array, default: () => [] },
    after: { type: Array, default: () => [] },
  },
  data() {
    return { expanded: false };
  },
  computed: {
    beforeSet() {
      return new Set((this.before || []).map(String));
    },
    afterSet() {
      return new Set((this.after || []).map(String));
    },
    addedItems() {
      return [...this.afterSet].filter((v) => !this.beforeSet.has(v));
    },
    removedItems() {
      return [...this.beforeSet].filter((v) => !this.afterSet.has(v));
    },
    addedCount() {
      return this.addedItems.length;
    },
    removedCount() {
      return this.removedItems.length;
    },
  },
};
</script>

<style lang="scss" scoped>
.array-diff {
  font-size: var(--fs-200);
}
.array-diff__summary {
  display: flex;
  gap: var(--space-300);
}
.array-diff__toggle {
  margin-top: var(--space-100);
  padding: 0;
  background: none;
  border: none;
  color: var(--c-primary-300);
  cursor: pointer;
  text-decoration: underline;
  font-size: var(--fs-100);
}
.array-diff__details {
  margin-top: var(--space-200);
}
.array-diff__list {
  list-style: none;
  margin: 0;
  padding: 0;
  font-family: var(--font-mono, monospace);
}
</style>
