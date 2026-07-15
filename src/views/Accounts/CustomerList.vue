<template>
  <div class="acc-list__wrapper p-500 fs-300 t-basic-800 h-100 ov-h">
    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500">
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("accounts.customers") }}</h1>
      </div>

      <!-- Filters -->
      <div class="flex ai-ct mb-400">
        <MobileFilterPanel
          :active-count="activeFilterCount"
          :trigger-label="$t('builder.filters')"
        >
          <p class="fs-200 t-basic-600">{{ $t("builder.filters") }}</p>
          <FilterChip
            v-for="tab in statusTabs"
            :key="tab.key"
            :label="tab.label"
            :active="statusFilter === tab.key"
            @click="setStatusFilter(tab.key)"
          />
        </MobileFilterPanel>
      </div>

      <div class="flex ai-ct gap-300 mb-400 flex-wrap">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="acc-list__search"
          @input="debouncedFetch(searchAndFetch)"
        />
        <Dropdown
          v-if="groupOptions.length"
          :values="groupOptions"
          :selected="groupFilter ? [groupFilter] : []"
          :placeholder="$t('accounts.group')"
          class="acc-list__filter-dropdown"
          @onSelect="setGroupFilter"
        />
        <Dropdown
          v-if="channelOptions.length"
          :values="channelOptions"
          :selected="channelFilter ? [channelFilter] : []"
          :placeholder="$t('accounts.channel')"
          class="acc-list__filter-dropdown"
          @onSelect="setChannelFilter"
        />
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="customers"
        :sortable="true"
        row-key="uid"
        :empty-text="$t('accounts.no_customers')"
        @sort="onSort"
        @row-click="onRowClick"
      >
        <template #cell-name="{ row }">
          {{ row.firstname }} {{ row.lastname }}
        </template>
        <template #cell-group="{ value }">
          <span v-if="value" class="bg-support-100 t-support-400 fs-200 ph-100 br-50">
            {{ value }}
          </span>
          <span v-else class="t-basic-400">---</span>
        </template>
        <template #cell-source_channel="{ value }">
          <span v-if="value" class="t-basic-600 fs-200">{{ value }}</span>
          <span v-else class="t-basic-400">---</span>
        </template>
        <template #cell-status="{ row }">
          <div class="flex gap-100">
            <StatusBadge
              :label="row.is_active ? $t('accounts.active') : $t('accounts.inactive')"
              :variant="row.is_active ? 'positive' : 'negative'"
            />
            <StatusBadge
              v-if="row.is_verified"
              :label="$t('accounts.verified')"
              variant="informative"
            />
          </div>
        </template>
        <template #cell-created_at="{ value }">
          {{ formatDate(value) }}
        </template>
      </DataTable>

      <Pagination
        v-if="totalCount > pageSize"
        :pagination="paginationState"
        @onChangePage="onPageChange"
      />
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import {
  GET_Customers,
  GET_AccountsGroups,
  GET_AccountsChannels,
} from "@/api/accounts/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "CustomerList",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const { search, debouncedFetch } = useSearchDebounce();
    return { loader, notify, search, debouncedFetch };
  },
  data() {
    return {
      customers: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      ordering: null,
      loading: false,
      statusFilter: "all",
      groupFilter: null,
      channelFilter: null,
      groupOptions: [],
      channelOptions: [],
    };
  },
  computed: {
    statusTabs() {
      return [
        { key: "all", label: this.$t("accounts.status") + ": All" },
        { key: "active", label: this.$t("accounts.active") },
        { key: "inactive", label: this.$t("accounts.inactive") },
        { key: "verified", label: this.$t("accounts.verified") },
        { key: "not_verified", label: this.$t("accounts.not_verified") },
      ];
    },
    activeFilterCount() {
      let count = 0;
      if (this.statusFilter !== "all") count++;
      if (this.groupFilter) count++;
      if (this.channelFilter) count++;
      return count;
    },
    columns() {
      return [
        { key: "email", label: "Email", sortable: true, width: "1fr" },
        { key: "name", label: "Name", sortable: false, width: "180px" },
        { key: "group", label: this.$t("accounts.group"), sortable: false, width: "120px" },
        { key: "source_channel", label: this.$t("accounts.channel"), sortable: false, width: "140px" },
        { key: "status", label: this.$t("accounts.status"), sortable: false, width: "160px" },
        { key: "created_at", label: "Created", sortable: true, width: "140px" },
      ];
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.ceil(this.totalCount / this.pageSize),
      };
    },
  },
  watch: {
    "$route.query.page"(newPage) {
      this.currentPage = parseInt(newPage) || 1;
      this.fetchCustomers();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchCustomers();
    this.fetchFilterOptions();
  },
  methods: {
    async fetchCustomers() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.ordering) params.ordering = this.ordering;
        if (this.groupFilter) params.group = this.groupFilter;
        if (this.channelFilter) params.source_channel = this.channelFilter;

        if (this.statusFilter === "active") params.is_active = true;
        else if (this.statusFilter === "inactive") params.is_active = false;
        else if (this.statusFilter === "verified") params.is_verified = true;
        else if (this.statusFilter === "not_verified") params.is_verified = false;

        const { data } = await GET_Customers(params);
        this.customers = data.results || [];
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
    async fetchFilterOptions() {
      try {
        const [groupsRes, channelsRes] = await Promise.all([
          GET_AccountsGroups({ page_size: 100 }),
          GET_AccountsChannels({ page_size: 100 }),
        ]);
        this.groupOptions = (groupsRes.data.results || []).map((g) => ({
          label: g.name,
          value: g.code,
        }));
        this.channelOptions = (channelsRes.data.results || []).map((c) => ({
          label: c.label,
          value: c.idx,
        }));
      } catch {
        // Filters won't show — non-blocking
      }
    },
    setStatusFilter(key) {
      this.statusFilter = key;
      this.currentPage = 1;
      this.fetchCustomers();
    },
    setGroupFilter(val) {
      this.groupFilter = this.groupFilter === val ? null : val;
      this.currentPage = 1;
      this.fetchCustomers();
    },
    setChannelFilter(val) {
      this.channelFilter = this.channelFilter === val ? null : val;
      this.currentPage = 1;
      this.fetchCustomers();
    },
    searchAndFetch() {
      this.currentPage = 1;
      this.fetchCustomers();
    },
    onSort({ key, direction }) {
      if (!key) {
        this.ordering = null;
      } else {
        const mapping = { email: "email", created_at: "created_at" };
        const field = mapping[key] || key;
        this.ordering = direction === "desc" ? `-${field}` : field;
      }
      this.fetchCustomers();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/accounts/customers/${row.uid}`);
    },
    formatDate(dateStr) {
      if (!dateStr) return "---";
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.acc-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}

.acc-list__filter-dropdown {
  min-width: 120px;
  max-width: 200px;
}

@media only screen and (max-width: 768px) {
  .acc-list__wrapper {
    padding: 16px !important;
  }
}
</style>
