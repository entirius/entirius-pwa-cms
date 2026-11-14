<template>
  <PageLayout class="fs-300 t-body">
    <template #header>
      <PageHeader :title="$t('stock_alerts.subscriptions')" :description="$t('stock_alerts.subscriptions_help')">
        <template #actions>
          <ActionBar :actions="headerActions" />
        </template>
      </PageHeader>
    </template>
    <template #toolbar>
      <div class="flex ai-ct flex-wrap gap-8 rg-3">
        <BasicInput
          v-model="search"
          :placeholder="$t('stock_alerts.search_subscriptions')"
          icon="search"
          class="stock-alerts__search"
          @input="debouncedFetch(searchAndFetch)"
        />
        <BasicSelect
          :floating-label="$t('stock_alerts.status')"
          :options="statusOptions"
          :model-value="statusFilter"
          class="stock-alerts__filter"
          @update:model-value="onStatusFilter"
        />
        <Tag
          v-if="skuFilter"
          :label="$t('stock_alerts.sku_filter', { sku: skuFilter })"
          removable
          data-testid="stock-alerts-sku-chip"
          @remove="clearSku"
        />
      </div>
    </template>

    <Loader block v-if="loading" />

    <DataTable
      v-else
      :columns="columns"
      :rows="rows"
      row-key="id"
      :row-attrs="(row) => ({ 'data-testid': `stock-alerts-request-${row.id}` })"
      :empty-text="$t('stock_alerts.no_requests')"
      empty-size="md"
    >
      <template #cell-product="{ row }">
        <div class="flex flex-column" :title="row.product_name || row.sku">
          <span class="fw-500">{{ row.product_name || row.sku }}</span>
          <span class="t-muted fs-200">{{ [row.variant_line, row.sku].filter(Boolean).join(" · ") }}</span>
        </div>
      </template>
      <template #cell-status="{ value }">
        <StatusBadge :label="$t(`stock_alerts.status_${value}`)" :tone="STATUS_TONES[value] || 'neutral'" />
      </template>
      <template #cell-created="{ value }">{{ formatDate(value) }}</template>
      <template #cell-notified_at="{ value }">{{ formatDate(value) }}</template>
      <template #cell-actions="{ row }">
        <BasicButton
          v-if="row.status === 'waiting'"
          size="sm"
          mutates
          :data-testid="`stock-alerts-cancel-${row.id}`"
          @click="pendingCancel = row"
        >
          {{ $t("stock_alerts.cancel_request") }}
        </BasicButton>
      </template>
    </DataTable>

    <template v-if="pages > 1" #footer>
      <Pagination :page="currentPage" :pages="pages" @update:page="onPageChange" />
    </template>

    <ConfirmDialog
      :open="!!pendingCancel"
      :title="$t('stock_alerts.cancel_title')"
      :message="$t('stock_alerts.cancel_message', { sku: pendingCancel?.sku || '' })"
      :confirm-label="$t('stock_alerts.cancel_request')"
      :cancel-label="$t('stock_alerts.keep')"
      @confirm="cancelRequest"
      @cancel="pendingCancel = null"
    />
  </PageLayout>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { extractApiMessage } from "@/composables/useFormErrors";
import { formatDate } from "@/utils/format";
import {
  GET_StockAlertsSubscriptions,
  GET_StockAlertsExport,
  POST_StockAlertsCancel,
} from "@/api/stockAlerts/api";

// The back-in-stock requests (django-stock-alerts) with their addresses: the only screen that shows them. `?sku` (set
// by a Demand row) and `?page` live in the query string; search and status stay local.
const PAGE_SIZE = 20;
const ALL = "__all";
const STATUSES = ["waiting", "notified", "cancelled", "expired"];
// A blob request answers its error as a Blob too: read it back as the JSON error body extractApiMessage knows.
async function withJsonBody(err) {
  const data = err?.response?.data;
  if (!(data instanceof Blob)) return err;
  try {
    err.response.data = JSON.parse(await data.text());
  } catch {
    // Not JSON: the generic message stays.
  }
  return err;
}

const STATUS_TONES = { waiting: "info", notified: "positive", cancelled: "neutral", expired: "warning" };

export default {
  name: "StockAlertsSubscriptions",
  setup() {
    const { search, debouncedFetch } = useSearchDebounce(400);
    return { loader: useLoaderStore(), notify: useNotifyStore(), search, debouncedFetch, STATUS_TONES };
  },
  data() {
    return { rows: [], totalCount: 0, currentPage: 1, statusFilter: ALL, loading: false, pendingCancel: null };
  },
  computed: {
    skuFilter() {
      return this.$route.query.sku || "";
    },
    statusOptions() {
      return [
        { label: this.$t("stock_alerts.status_all"), value: ALL },
        ...STATUSES.map((value) => ({ label: this.$t(`stock_alerts.status_${value}`), value })),
      ];
    },
    columns() {
      return [
        { key: "product", label: this.$t("stock_alerts.product"), width: "1fr", truncate: true, priority: 2 },
        { key: "email", label: this.$t("stock_alerts.address"), width: "1fr", truncate: true },
        { key: "language", label: this.$t("stock_alerts.language"), width: "100px", priority: 2 },
        { key: "status", label: this.$t("stock_alerts.status"), width: "max-content" },
        { key: "created", label: this.$t("stock_alerts.created"), width: "160px", priority: 2 },
        { key: "notified_at", label: this.$t("stock_alerts.notified"), width: "160px", priority: 2 },
        { key: "actions", label: "", actions: true },
      ];
    },
    headerActions() {
      return [
        {
          key: "csv",
          role: "secondary",
          mutates: false,
          label: this.$t("stock_alerts.download_csv"),
          onClick: this.downloadCsv,
        },
      ];
    },
    pages() {
      return Math.ceil(this.totalCount / PAGE_SIZE);
    },
  },
  watch: {
    "$route.query"() {
      this.currentPage = parseInt(this.$route.query.page) || 1;
      this.fetchRequests();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchRequests();
  },
  methods: {
    formatDate,
    filterParams() {
      const params = {};
      if (this.search) params.search = this.search;
      if (this.statusFilter !== ALL) params.status = this.statusFilter;
      if (this.skuFilter) params.sku = this.skuFilter;
      return params;
    },
    async fetchRequests() {
      this.loading = true;
      try {
        const params = { ...this.filterParams(), page: this.currentPage, page_size: PAGE_SIZE };
        const { data } = await GET_StockAlertsSubscriptions(params);
        this.rows = data.results || [];
        this.totalCount = data.count || 0;
      } catch (err) {
        this.showError(err);
      } finally {
        this.loading = false;
      }
    },
    // A new filter starts at page 1: a `?page` left in the URL would come back on the next page click or reload.
    searchAndFetch() {
      this.currentPage = 1;
      const { page, ...query } = this.$route.query;
      if (page) this.$router.replace({ path: this.$route.path, query });
      else this.fetchRequests();
    },
    onStatusFilter(value) {
      this.statusFilter = value;
      this.searchAndFetch();
    },
    clearSku() {
      const { sku, page, ...query } = this.$route.query;
      this.$router.push({ path: this.$route.path, query });
    },
    onPageChange(page) {
      this.$router.push({ path: this.$route.path, query: { ...this.$route.query, page: String(page) } });
    },
    async cancelRequest() {
      const row = this.pendingCancel;
      this.pendingCancel = null;
      this.loader.loaderStart();
      try {
        await POST_StockAlertsCancel(row.id);
        this.notify.spawnNotification({ type: "positive", msg: this.$t("stock_alerts.cancelled") });
        await this.fetchRequests();
      } catch (err) {
        this.showError(err);
      } finally {
        this.loader.loaderFinish();
      }
    },
    async downloadCsv() {
      try {
        const response = await GET_StockAlertsExport(this.filterParams());
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "stock-alerts.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        this.showError(await withJsonBody(err));
      }
    },
    showError(err) {
      this.notify.spawnNotification({ type: "negative", msg: extractApiMessage(err, this.$t("notifications.error")) });
    },
  },
};
</script>

<style lang="scss" scoped>
.stock-alerts__search {
  flex: 1;
  max-width: 400px;
}

.stock-alerts__filter {
  width: 180px;
  flex-shrink: 0;
}
</style>
