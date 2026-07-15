<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500">
      <div class="item-list__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="item-list__search"
          @input="debouncedFetch(searchAndFetch)"
        />
        <MobileFilterPanel
          :active-count="activeFilterCount"
          :trigger-label="$t('builder.filters')"
        >
          <p class="fs-200 t-basic-600">{{ $t("builder.filters") }}</p>
          <FilterChip
            v-for="tab in statusTabs"
            :key="tab.key"
            :label="tab.label"
            :active="activeFilter === tab.key"
            @click="setFilter(tab.key)"
          />
          <Dropdown
            :values="groupFilterOptions"
            :selected="groupFilter ? [groupFilter] : []"
            :placeholder="$t('faq.all_groups')"
            class="item-list__group-filter"
            @onSelect="onGroupFilter"
          />
        </MobileFilterPanel>
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="items"
        :sortable="true"
        row-key="id"
        :empty-text="$t('faq.no_items')"
        @sort="onSort"
        @row-click="onRowClick"
      >
        <template #cell-question="{ row }">
          <span class="item-question">{{ row.question }}</span>
        </template>
        <template #cell-group_name="{ row }">
          <span v-if="row.group_name" class="chip bg-support-100 t-support-400">
            {{ row.group_name }}
          </span>
          <span v-else class="t-basic-400">—</span>
        </template>
        <template #cell-association_count="{ row }">
          <span class="chip bg-basic-200 t-basic-600">
            {{ (row.associations || []).length }}
          </span>
        </template>
        <template #cell-is_active="{ value }">
          <StatusBadge
            :label="value ? $t('faq.active') : $t('faq.inactive')"
            :variant="value ? 'positive' : 'negative'"
          />
        </template>
      </DataTable>

      <Pagination
        v-if="totalCount > pageSize"
        :pagination="paginationState"
        @onChangePage="onPageChange"
      />

      <FloatingActions :actions="fabActions" />
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { GET_FaqItems, GET_FaqGroups } from "@/api/faq/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "FaqItemList",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const { search, debouncedFetch } = useSearchDebounce();
    return { loader, notify, search, debouncedFetch };
  },
  data() {
    return {
      items: [],
      groups: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      ordering: null,
      loading: false,
      activeFilter: "all",
      groupFilter: null,
    };
  },
  computed: {
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("faq.create_item"),
          handler: () => this.$router.push("/faq/items/create"),
        },
      ];
    },
    statusTabs() {
      return [
        { key: "all", label: this.$t("faq.filter_all") },
        { key: "active", label: this.$t("faq.filter_active") },
        { key: "inactive", label: this.$t("faq.filter_inactive") },
      ];
    },
    groupFilterOptions() {
      const opts = [{ label: this.$t("faq.all_groups"), value: null }];
      for (const g of this.groups) {
        opts.push({ label: g.name || g.idx, value: g.id });
      }
      return opts;
    },
    activeFilterCount() {
      let count = 0;
      if (this.activeFilter !== "all") count++;
      if (this.groupFilter) count++;
      return count;
    },
    columns() {
      return [
        {
          key: "position",
          label: this.$t("faq.position"),
          sortable: true,
          width: "80px",
        },
        {
          key: "question",
          label: this.$t("faq.question"),
          sortable: true,
          width: "1fr",
        },
        {
          key: "group_name",
          label: this.$t("faq.group"),
          sortable: false,
          width: "160px",
        },
        {
          key: "association_count",
          label: this.$t("faq.associations"),
          sortable: false,
          width: "100px",
        },
        {
          key: "is_active",
          label: this.$t("faq.status"),
          sortable: true,
          width: "100px",
        },
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
      this.fetchItems();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchGroups();
    this.fetchItems();
  },
  methods: {
    async fetchGroups() {
      try {
        const channel = process.env.VUE_APP_CHANNEL;
        const { data } = await GET_FaqGroups(channel, { page_size: 100 });
        this.groups = data.results || [];
      } catch {
        // Non-critical — silently ignore
      }
    },
    async fetchItems() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.ordering) params.ordering = this.ordering;
        if (this.activeFilter === "active") params.is_active = true;
        if (this.activeFilter === "inactive") params.is_active = false;
        if (this.groupFilter) params.group = this.groupFilter;

        const channel = process.env.VUE_APP_CHANNEL;
        const { data } = await GET_FaqItems(channel, params);
        this.items = data.results || [];
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
    setFilter(key) {
      this.activeFilter = key;
      this.currentPage = 1;
      this.fetchItems();
    },
    onGroupFilter(val) {
      this.groupFilter = val;
      this.currentPage = 1;
      this.fetchItems();
    },
    searchAndFetch() {
      this.currentPage = 1;
      this.fetchItems();
    },
    onSort({ key, direction }) {
      if (!key || key === "group_name" || key === "association_count") {
        this.ordering = null;
      } else {
        this.ordering = direction === "desc" ? `-${key}` : key;
      }
      this.fetchItems();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/faq/items/${row.id}`);
    },
  },
};
</script>

<style lang="scss" scoped>
.item-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}

.item-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}

.item-list__group-filter {
  min-width: 150px;
  max-width: 200px;
  flex-shrink: 0;
}

.item-question {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>
