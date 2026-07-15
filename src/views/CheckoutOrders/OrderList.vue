<template>
  <div class="order-list p-500 fs-300 t-basic-800 h-100 ov-h">
    <!-- Channel selector in toolbar (matches PIM pattern) -->
    <Teleport to="#checkout-orders-toolbar-left" defer>
      <span v-if="channels.length > 1" class="flex ai-ct gap-100">
        <span class="t-basic-500 fs-200"
          >{{ $t("checkout_orders.channel") }}:</span
        >
        <Dropdown
          :values="channelOptions"
          :selected="activeChannel ? [activeChannel] : []"
          :placeholder="$t('checkout_orders.channel')"
          class="order-list__channel-dropdown"
          @onSelect="onChannelChange"
        />
      </span>
    </Teleport>

    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <!-- Heading -->
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("checkout_orders.orders") }}</h1>
      </div>

      <!-- Status FilterChips -->
      <div class="flex ai-ct mb-400">
        <MobileFilterPanel
          :active-count="activeFilterCount"
          :trigger-label="$t('checkout_orders.filters')"
        >
          <p class="fs-200 t-basic-600">{{ $t("checkout_orders.filters") }}</p>
          <FilterChip
            v-for="tab in statusTabs"
            :key="tab.key"
            :label="tab.label"
            :active="selectedStatus === tab.key"
            @click="setStatusFilter(tab.key)"
          />
        </MobileFilterPanel>
      </div>

      <!-- Search -->
      <div class="flex ai-ct gap-300 mb-400 flex-wrap">
        <BasicInput
          v-model="search"
          icon="search"
          :placeholder="$t('checkout_orders.search_placeholder')"
          class="order-list__search"
          @input="onSearchInput"
        />
      </div>

      <Loader v-show="loading" />

      <!-- Table -->
      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="orders"
        :clickable="true"
        :empty-text="$t('checkout_orders.no_orders')"
        @row-click="onRowClick"
      >
        <template #status="{ row }">
          <StatusBadge
            :label="statusLabel(row.status)"
            :variant="statusVariant(row.status)"
          />
        </template>
        <template #total_gross="{ row }">
          <span v-if="row.total_gross"
            >{{ row.total_gross }} {{ row.currency }}</span
          >
          <span v-else class="t-basic-500">-</span>
        </template>
        <template #created="{ row }">
          {{ formatDate(row.created) }}
        </template>
      </DataTable>

      <!-- Pagination -->
      <Pagination
        v-if="totalCount > pageSize"
        :pagination="paginationState"
        @onChangePage="onPageChange"
      />
    </div>
  </div>
</template>

<script>
import { GET_Orders } from "@/api/orders/api";
import { useNotifyStore } from "@/stores/notify";
import { extractApiMessage } from "@/composables/useFormErrors";

const STATUS_VARIANTS = {
  UNPAID: "warning",
  NEW: "warning",
  CONFIRMED: "positive",
  HOLDED: "informative",
  IN_PROGRESS: "informative",
  COMPLETED: "positive",
  RETURNED: "neutral",
  CANCELED: "negative",
};

export default {
  name: "OrderList",
  setup() {
    const notify = useNotifyStore();
    return { notify };
  },
  data() {
    return {
      orders: [],
      totalCount: 0,
      loading: false,
      selectedStatus: "all",
      search: "",
      searchTimer: null,
      pageSize: 20,
      activeChannel: process.env.VUE_APP_CHANNEL || "default-local",
      channels: [],
      columns: [
        {
          key: "pretty_id",
          label: this.$t("checkout_orders.order_id"),
          width: "120px",
        },
        {
          key: "billing_email",
          label: this.$t("checkout_orders.email"),
          width: "1fr",
        },
        {
          key: "status",
          label: this.$t("checkout_orders.status"),
          width: "130px",
        },
        {
          key: "total_gross",
          label: this.$t("checkout_orders.total"),
          width: "120px",
        },
        {
          key: "item_count",
          label: this.$t("checkout_orders.items"),
          width: "80px",
        },
        {
          key: "created",
          label: this.$t("checkout_orders.created"),
          width: "140px",
        },
      ],
    };
  },
  computed: {
    currentPage() {
      return parseInt(this.$route.query.page || "1", 10);
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.ceil(this.totalCount / this.pageSize),
      };
    },
    activeFilterCount() {
      return this.selectedStatus && this.selectedStatus !== "all" ? 1 : 0;
    },
    statusTabs() {
      return [
        { key: "all", label: this.$t("checkout_orders.all_statuses") },
        { key: "unpaid", label: this.$t("checkout_orders.statuses.UNPAID") },
        {
          key: "confirmed",
          label: this.$t("checkout_orders.statuses.CONFIRMED"),
        },
        {
          key: "in_progress",
          label: this.$t("checkout_orders.statuses.IN_PROGRESS"),
        },
        {
          key: "completed",
          label: this.$t("checkout_orders.statuses.COMPLETED"),
        },
        {
          key: "returned",
          label: this.$t("checkout_orders.statuses.RETURNED"),
        },
        {
          key: "canceled",
          label: this.$t("checkout_orders.statuses.CANCELED"),
        },
      ];
    },
    channelOptions() {
      return this.channels.map((ch) => ({
        label: ch.label || ch.idx,
        value: ch.idx,
      }));
    },
  },
  watch: {
    "$route.query"() {
      this.fetchOrders();
    },
  },
  mounted() {
    if (this.$route.query.status)
      this.selectedStatus = this.$route.query.status;
    if (this.$route.query.channel)
      this.activeChannel = this.$route.query.channel;
    this.fetchChannels();
    this.fetchOrders();
  },
  methods: {
    async fetchChannels() {
      // TODO: replace with admin channels endpoint when available
      this.channels = [
        { idx: "default-local", label: "Default Local" },
        { idx: "default-europe", label: "Default Europe" },
      ];
    },
    async fetchOrders() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.email = this.search;
        if (this.selectedStatus && this.selectedStatus !== "all")
          params.status = this.selectedStatus;
        const { data } = await GET_Orders(this.activeChannel, params);
        this.orders = data.results || [];
        this.totalCount = data.count || 0;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    onSearchInput() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.updateQuery({ page: 1 }), 400);
    },
    setStatusFilter(key) {
      this.selectedStatus = key;
      this.updateQuery({ page: 1, status: key === "all" ? undefined : key });
    },
    onChannelChange(value) {
      this.activeChannel = value;
      this.updateQuery({ page: 1, channel: value });
    },
    onPageChange(page) {
      this.updateQuery({ page });
    },
    updateQuery(overrides) {
      const q = { ...this.$route.query, ...overrides };
      Object.keys(q).forEach((k) => {
        if (!q[k]) delete q[k];
      });
      this.$router.replace({ query: q });
    },
    onRowClick(row) {
      this.$router.push({
        name: "OrderDetail",
        params: { uid: row.pretty_id || row.order_id },
        query: { channel: this.activeChannel },
      });
    },
    statusVariant(s) {
      return STATUS_VARIANTS[(s || "").toUpperCase()] || "neutral";
    },
    statusLabel(s) {
      const k = `checkout_orders.statuses.${(s || "").toUpperCase()}`;
      const t = this.$t(k);
      return t !== k ? t : s;
    },
    formatDate(d) {
      if (!d) return "-";
      return new Date(d).toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.order-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}
.order-list__channel-dropdown {
  min-width: 160px;
}
</style>
