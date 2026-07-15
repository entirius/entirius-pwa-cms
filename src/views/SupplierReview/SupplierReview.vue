<template>
  <div class="supplier-review h-100 ovy-auto">
    <div class="supplier-review__toolbar p-300 b-basic-300 bb-100 bg-basic-100">
      <div class="flex ai-ct gap-300 flex-wrap">
        <SegmentedControl
          v-model="activeMode"
          :options="modeOptions"
          data-testid="review-mode-switch"
        />
        <div class="flex ai-ct gap-200 ml-auto flex-wrap">
          <BasicInput
            v-model="filters.search"
            :placeholder="$t('common.start_typing')"
            icon="search"
            class="review-search"
            data-testid="review-search-input"
            @input="onSearchChange"
          />
          <Dropdown
            :values="supplierFilterOptions"
            :selected="[filters.supplier]"
            :placeholder="$t('suppliers.col.name')"
            class="review-supplier-filter"
            data-testid="review-supplier-filter"
            @onSelect="onSupplierChange"
          />
        </div>
      </div>
      <div
        v-if="activeMode !== 'events' && activeMode !== 'updated'"
        class="flex ai-ct flex-wrap gap-100 mt-200"
      >
        <FilterChip
          v-for="opt in statusOptions"
          :key="opt.value"
          :label="opt.label"
          :active="filters.status === opt.value"
          :data-testid="`review-status-${opt.value}`"
          @click="onStatusChange(opt.value)"
        />
      </div>
    </div>

    <div class="supplier-review__body">
      <SwipeMode
        v-if="activeMode === 'swipe'"
        :filters="filters"
        @reviewed="onReviewed"
      />
      <ListMode v-else-if="activeMode === 'list'" class="p-300" :filters="filters" />
      <EventsMode v-else-if="activeMode === 'events'" class="p-300" :filters="filters" />
      <UpdatedMode v-else class="p-300" :filters="filters" />
    </div>
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import SwipeMode from "./SwipeMode.vue";
import ListMode from "./ListMode.vue";
import EventsMode from "./EventsMode.vue";
import { GET_Suppliers } from "@/api/suppliers/api";

const UpdatedMode = defineAsyncComponent(() => import("./UpdatedMode.vue"));

export default {
  name: "SupplierReview",
  components: { SwipeMode, ListMode, EventsMode, UpdatedMode },
  data() {
    return {
      activeMode: this.$route.query.mode || "swipe",
      suppliers: [],
      filters: {
        supplier: this.$route.query.supplier || "__all",
        status: "queued",
        search: "",
      },
      searchTimer: null,
    };
  },
  computed: {
    modeOptions() {
      return [
        { value: "swipe", label: this.$t("supplier_review.modes.swipe"), testid: "review-mode-swipe" },
        { value: "list", label: this.$t("supplier_review.modes.list"), testid: "review-mode-list" },
        { value: "events", label: this.$t("supplier_review.modes.events"), testid: "review-mode-events" },
        { value: "updated", label: this.$t("supplier_review.modes.updated"), testid: "review-mode-updated" },
      ];
    },
    statusOptions() {
      return [
        { value: "__all", label: this.$t("common.all") },
        { value: "new", label: this.$t("supplier_review.status.new") },
        { value: "queued", label: this.$t("supplier_review.status.queued") },
        { value: "approved", label: this.$t("supplier_review.status.approved") },
        { value: "rejected", label: this.$t("supplier_review.status.rejected") },
        { value: "pushed", label: this.$t("supplier_review.status.pushed") },
      ];
    },
    supplierFilterOptions() {
      return [
        { value: "__all", label: this.$t("common.all") },
        ...this.suppliers.map((s) => ({ value: s.idx, label: s.name || s.idx })),
      ];
    },
  },
  watch: {
    activeMode(val) {
      this.$router.replace({
        path: this.$route.path,
        query: { ...this.$route.query, mode: val },
      });
    },
  },
  mounted() {
    this.fetchSuppliers();
  },
  methods: {
    async fetchSuppliers() {
      try {
        const { data } = await GET_Suppliers({ page_size: 100 });
        this.suppliers = data.results || [];
      } catch (err) {
        // soft-fail; supplier filter will show only "__all"
        this.suppliers = [];
      }
    },
    onSupplierChange(val) {
      this.filters = { ...this.filters, supplier: val };
    },
    onStatusChange(val) {
      this.filters = { ...this.filters, status: val };
    },
    onSearchChange() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.filters = { ...this.filters };
      }, 300);
    },
    onReviewed() {
      // Bubble-up hook (e.g. global counter); SwipeMode advances internally.
    },
  },
};
</script>

<style lang="scss" scoped>
.supplier-review {
  display: flex;
  flex-direction: column;
}
.supplier-review__toolbar {
  flex-shrink: 0;
}
.supplier-review__body {
  flex: 1;
  overflow: auto;
}
.review-search {
  min-width: 180px;
  max-width: 280px;
}
.review-supplier-filter {
  min-width: 180px;
}
</style>
