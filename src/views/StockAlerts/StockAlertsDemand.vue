<template>
  <PageLayout class="fs-300 t-body">
    <template #header>
      <PageHeader :title="$t('stock_alerts.demand')" :description="$t('stock_alerts.demand_help')" />
    </template>
    <template #toolbar>
      <BasicInput
        v-model="search"
        :placeholder="$t('stock_alerts.search_demand')"
        icon="search"
        class="stock-alerts__search"
        @input="debouncedFetch(searchAndFetch)"
      />
    </template>

    <Loader block v-if="loading" />

    <template v-else>
      <p v-if="rows.length" class="t-muted mb-4" data-testid="stock-alerts-summary">
        {{ $t("stock_alerts.summary", { waiting: totalWaiting, variants: totalCount }) }}
      </p>
      <DataTable
        :columns="columns"
        :rows="rows"
        :sortable="true"
        row-key="sku"
        :row-attrs="(row) => ({ 'data-testid': `stock-alerts-demand-${row.sku}` })"
        :empty-text="$t('stock_alerts.no_requests')"
        empty-size="md"
        @sort="onSort"
        @row-click="onRowClick"
      >
        <template v-if="!search" #empty>
          <EmptyState
            icon="empty"
            size="md"
            :title="$t('stock_alerts.empty_title')"
            :message="$t('stock_alerts.empty_message')"
          />
        </template>
        <template #cell-product="{ row }">
          <div class="flex flex-column" :title="row.product_name || row.sku">
            <span class="fw-500">{{ row.product_name || row.sku }}</span>
            <span class="t-muted fs-200">{{ secondaryLine(row) }}</span>
          </div>
        </template>
        <template #cell-oldest_request="{ value }">
          <BasicTooltip :text="formatDate(value)">
            <span>{{ formatRelative(value) }}</span>
          </BasicTooltip>
        </template>
        <template #cell-quantity="{ value }">
          <StatusBadge v-bind="stockBadge(value)" />
        </template>
      </DataTable>
    </template>

    <template v-if="pages > 1" #footer>
      <Pagination :page="currentPage" :pages="pages" @update:page="onPageChange" />
    </template>
  </PageLayout>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { extractApiMessage } from "@/composables/useFormErrors";
import { formatDate, formatRelative } from "@/utils/format";
import { GET_StockAlertsDemand } from "@/api/stockAlerts/api";

// Which variants customers wait for (django-stock-alerts): no addresses here, only counts per SKU. A row opens the
// requests of that SKU.
const PAGE_SIZE = 20;
const DEFAULT_ORDERING = "-waiting";

export default {
  name: "StockAlertsDemand",
  setup() {
    const { search, debouncedFetch } = useSearchDebounce(400);
    return { notify: useNotifyStore(), search, debouncedFetch };
  },
  data() {
    return { rows: [], totalCount: 0, totalWaiting: 0, currentPage: 1, ordering: DEFAULT_ORDERING, loading: false };
  },
  computed: {
    columns() {
      return [
        { key: "product", label: this.$t("stock_alerts.product"), width: "1fr", truncate: true },
        { key: "waiting", label: this.$t("stock_alerts.waiting"), width: "120px", numeric: true, sortable: true },
        { key: "oldest_request", label: this.$t("stock_alerts.oldest_request"), width: "160px", sortable: true, priority: 2 },
        { key: "quantity", label: this.$t("stock_alerts.in_stock_now"), width: "max-content" },
        { key: "notified_30d", label: this.$t("stock_alerts.notified_30d"), width: "160px", numeric: true, priority: 2 },
      ];
    },
    pages() {
      return Math.ceil(this.totalCount / PAGE_SIZE);
    },
  },
  watch: {
    "$route.query.page"(page) {
      this.currentPage = parseInt(page) || 1;
      this.fetchDemand();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchDemand();
  },
  methods: {
    formatDate,
    formatRelative,
    secondaryLine(row) {
      return [row.variant_line, row.sku].filter(Boolean).join(" · ");
    },
    stockBadge(quantity) {
      return quantity > 0
        ? { label: this.$t("stock_alerts.in_stock", { count: quantity }), tone: "positive" }
        : { label: this.$t("stock_alerts.sold_out"), tone: "neutral" };
    },
    async fetchDemand() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: PAGE_SIZE, ordering: this.ordering };
        if (this.search) params.search = this.search;
        const { data } = await GET_StockAlertsDemand(params);
        this.rows = data.results || [];
        this.totalCount = data.count || 0;
        this.totalWaiting = data.total_waiting || 0;
      } catch (err) {
        this.notify.spawnNotification({ type: "negative", msg: extractApiMessage(err, this.$t("notifications.error")) });
      } finally {
        this.loading = false;
      }
    },
    // A new search starts at page 1: a `?page` left in the URL would come back on the next page click or reload.
    searchAndFetch() {
      this.currentPage = 1;
      const { page, ...query } = this.$route.query;
      if (page) this.$router.replace({ path: this.$route.path, query });
      else this.fetchDemand();
    },
    onSort({ key, direction }) {
      this.ordering = key ? `${direction === "desc" ? "-" : ""}${key}` : DEFAULT_ORDERING;
      this.fetchDemand();
    },
    onPageChange(page) {
      this.$router.push({ path: this.$route.path, query: { ...this.$route.query, page: String(page) } });
    },
    onRowClick(row) {
      this.$router.push({ name: "StockAlertsSubscriptions", query: { sku: row.sku } });
    },
  },
};
</script>

<style lang="scss" scoped>
.stock-alerts__search {
  flex: 1;
  max-width: 400px;
}
</style>
