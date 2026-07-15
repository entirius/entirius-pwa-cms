<template>
  <div class="supplier-timeline">
    <div class="supplier-timeline__header">
      <h3 class="fs-300 fw-600 m-0">{{ $t("pim.supplier.timeline.title") }}</h3>
      <div class="supplier-timeline__filters">
        <FilterChip
          v-for="opt in modeOptions"
          :key="opt.value"
          :label="opt.label"
          :active="mode === opt.value"
          @click="setMode(opt.value)"
        />
        <Dropdown
          v-if="mode === 'by_source' && sourceOptions.length > 1"
          :values="sourceOptions"
          :selected="selectedSource ? [selectedSource] : []"
          :placeholder="$t('pim.supplier.timeline.source_label')"
          class="supplier-timeline__source-dropdown"
          @onSelect="onSourceSelect"
        />
      </div>
    </div>
    <ul v-if="filteredEntries.length" class="supplier-timeline__list">
      <TimelineEntry v-for="entry in filteredEntries" :key="entry.id" :entry="entry" />
    </ul>
    <EmptyState
      v-else
      :title="$t('pim.supplier.timeline.empty')"
      :message="''"
      icon="clock-rotate-left"
    />
  </div>
</template>

<script>
import TimelineEntry from "./TimelineEntry.vue";

export default {
  name: "SupplierTimeline",
  components: { TimelineEntry },
  props: {
    entries: { type: Array, default: () => [] },
  },
  data() {
    return {
      mode: "all",
      selectedSource: null,
    };
  },
  computed: {
    modeOptions() {
      return [
        { value: "all", label: this.$t("pim.supplier.timeline.filter_all") },
        { value: "unseen", label: this.$t("pim.supplier.timeline.filter_unseen") },
        { value: "by_source", label: this.$t("pim.supplier.timeline.filter_by_source") },
      ];
    },
    sourceOptions() {
      const sources = [...new Set(this.entries.map((e) => e.source).filter(Boolean))];
      return [
        { value: null, label: this.$t("pim.supplier.timeline.filter_all") },
        ...sources.map((s) => ({ value: s, label: s.replaceAll("_", " ") })),
      ];
    },
    filteredEntries() {
      if (this.mode === "unseen") {
        return this.entries.filter((e) => !e.applied_to_pim);
      }
      if (this.mode === "by_source" && this.selectedSource) {
        return this.entries.filter((e) => e.source === this.selectedSource);
      }
      return this.entries;
    },
  },
  methods: {
    setMode(value) {
      this.mode = value;
      if (value !== "by_source") this.selectedSource = null;
    },
    onSourceSelect(val) {
      this.selectedSource = val;
    },
  },
};
</script>

<style lang="scss" scoped>
.supplier-timeline {
  margin-top: var(--space-400);
}
.supplier-timeline__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-200);
  margin-bottom: var(--space-200);
}
.supplier-timeline__filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-100);
}
.supplier-timeline__source-dropdown {
  min-width: 180px;
}
.supplier-timeline__list {
  list-style: none;
  margin: 0;
  padding: var(--space-200) 0;
  border-top: 1px solid var(--c-basic-200);
}
</style>
