<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct jc-sb mb-400 gap-300">
        <h1 class="fs-700 fw-600">
          {{ $t("suppliers.auto_matched.title") }}
        </h1>
        <span class="fs-200 t-basic-600">
          {{ $t("suppliers.auto_matched.subtitle") }}
        </span>
      </div>

      <!-- Filter chip bar -->
      <div class="flex ai-ct flex-wrap gap-100 mb-400">
        <FilterChip
          :label="$t('suppliers.auto_matched.filter.all')"
          :active="!hasViolationsOnly && !manualOverrideOnly && !supplierFilter"
          data-testid="auto-matched-filter-all"
          @click="resetFilters"
        />
        <FilterChip
          :label="$t('suppliers.auto_matched.filter.has_violations')"
          :active="hasViolationsOnly"
          data-testid="auto-matched-filter-violations"
          @click="toggleViolations"
        />
        <FilterChip
          :label="$t('suppliers.auto_matched.filter.manual_override_only')"
          :active="manualOverrideOnly"
          data-testid="auto-matched-filter-manual-override"
          @click="toggleManualOverride"
        />
      </div>

      <Loader v-show="loading" />

      <EmptyState
        v-if="!loading && rows.length === 0"
        :title="$t('suppliers.auto_matched.empty_title')"
        :message="$t('suppliers.auto_matched.empty_message')"
        icon="link"
      />

      <DataTable
        v-show="!loading && rows.length > 0"
        :columns="columns"
        :rows="rows"
        row-key="sku"
        :empty-text="$t('suppliers.auto_matched.empty_title')"
        @row-click="onRowClick"
      >
        <template #cell-suppliers="{ row }">
          <div class="flex ai-ct flex-wrap gap-100">
            <StatusBadge
              v-for="s in row.suppliers"
              :key="s.idx"
              :label="s.is_preferred ? `★ ${s.name || s.idx}` : (s.name || s.idx)"
              :variant="s.is_preferred ? 'positive' : 'neutral'"
              :data-testid="`auto-matched-supplier-${row.sku}-${s.idx}`"
            />
          </div>
        </template>
        <template #cell-flags="{ row }">
          <div class="flex ai-ct gap-100">
            <StatusBadge
              v-if="row.has_tolerance_violation"
              :label="$t('suppliers.auto_matched.flag.violation')"
              variant="warning"
              :data-testid="`auto-matched-violation-${row.sku}`"
            />
            <StatusBadge
              v-if="row.has_manual_override"
              :label="$t('suppliers.auto_matched.flag.manual_override')"
              variant="informative"
              :data-testid="`auto-matched-manual-override-${row.sku}`"
            />
          </div>
        </template>
        <template #cell-last_auto_link_at="{ value }">
          <span class="fs-200 t-basic-600">{{ formatDate(value) }}</span>
        </template>
      </DataTable>

      <Pagination
        v-if="!loading && totalCount > pageSize"
        :pagination="paginationState"
        class="mt-300"
        @onChangePage="onPageChange"
      />
    </div>
  </div>
</template>

<script>
import { GET_AutoMatched } from "@/api/suppliers/api";
import { useMuninStore } from "@/stores/munin";

export default {
  name: "AutoMatched",
  data() {
    return {
      rows: [],
      loading: false,
      page: 1,
      pageSize: 25,
      totalCount: 0,
      hasViolationsOnly: false,
      manualOverrideOnly: false,
      supplierFilter: "",
    };
  },
  computed: {
    columns() {
      return [
        { key: "sku", label: this.$t("suppliers.auto_matched.col.sku") },
        { key: "ean", label: this.$t("suppliers.auto_matched.col.ean") },
        {
          key: "suppliers",
          label: this.$t("suppliers.auto_matched.col.suppliers"),
        },
        { key: "flags", label: this.$t("suppliers.auto_matched.col.flags") },
        {
          key: "last_auto_link_at",
          label: this.$t("suppliers.auto_matched.col.last_auto_link"),
        },
      ];
    },
    paginationState() {
      return {
        currentPage: this.page,
        totalPages: Math.max(1, Math.ceil(this.totalCount / this.pageSize)),
        itemsPerPage: this.pageSize,
        totalItems: this.totalCount,
      };
    },
    hasSuppliersPanel() {
      return useMuninStore().isPanelEnabled("suppliers");
    },
  },
  watch: {
    hasViolationsOnly() {
      this.fetch();
    },
    manualOverrideOnly() {
      this.fetch();
    },
    supplierFilter() {
      this.fetch();
    },
  },
  mounted() {
    if (!this.hasSuppliersPanel) {
      this.$router.push("/");
      return;
    }
    this.fetch();
  },
  methods: {
    async fetch() {
      this.loading = true;
      try {
        const params = {
          page: this.page,
          page_size: this.pageSize,
        };
        if (this.hasViolationsOnly) params.has_violations = true;
        if (this.manualOverrideOnly) params.manual_override_only = true;
        if (this.supplierFilter) params.supplier = this.supplierFilter;
        const { data } = await GET_AutoMatched(params);
        this.rows = data?.results || [];
        this.totalCount = data?.count || 0;
      } catch (err) {
        this.rows = [];
        this.totalCount = 0;
        console.error("AutoMatched fetch failed", err);
      } finally {
        this.loading = false;
      }
    },
    resetFilters() {
      this.hasViolationsOnly = false;
      this.manualOverrideOnly = false;
      this.supplierFilter = "";
    },
    toggleViolations() {
      this.hasViolationsOnly = !this.hasViolationsOnly;
    },
    toggleManualOverride() {
      this.manualOverrideOnly = !this.manualOverrideOnly;
    },
    onPageChange(newPage) {
      this.page = newPage;
      this.fetch();
    },
    onRowClick(row) {
      // Deep-link to PIM ProductDetail Supplier tab (etap-06 hash sync wires #supplier).
      this.$router.push(`/pim/products/${encodeURIComponent(row.sku)}#supplier`);
    },
    formatDate(value) {
      if (!value) return "—";
      try {
        const d = new Date(value);
        return d.toLocaleString();
      } catch {
        return value;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
// All styling via design tokens. No hardcoded colours / spacing.
</style>
