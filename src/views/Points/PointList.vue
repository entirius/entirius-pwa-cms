<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("dp.points") }}</h1>
      </div>

      <!-- Filter tabs -->
      <div class="flex ai-ct mb-400">
        <MobileFilterPanel
          :active-count="activeFilter !== 'all' ? 1 : 0"
          :trigger-label="$t('builder.filters')"
        >
          <p class="fs-200 t-basic-600">{{ $t("builder.filters") }}</p>
          <FilterChip
            v-for="tab in filterTabs"
            :key="tab.key"
            :label="tab.label"
            :active="activeFilter === tab.key"
            @click="setFilter(tab.key)"
          />
        </MobileFilterPanel>
      </div>

      <div class="point-list__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="point-list__search"
          @input="debouncedFetch(searchAndFetch)"
        />
        <Dropdown
          :values="channelFilterOptions"
          :selected="[channelFilter]"
          :placeholder="$t('dp.channel')"
          class="point-list__channel"
          @onSelect="onChannelFilter"
        />
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="points"
        :sortable="true"
        row-key="id"
        :empty-text="$t('dp.no_points')"
        @sort="onSort"
        @row-click="onRowClick"
      >
        <template #cell-type_name="{ row }">
          <span v-if="row.type" class="chip t-support-400">
            <font-awesome-icon
              v-if="row.type.is_carrier"
              icon="lock"
              class="mr-50"
            />
            {{ row.type.name }}
          </span>
          <span v-else class="t-basic-400">---</span>
        </template>
        <template #cell-is_active="{ value }">
          <StatusBadge
            :label="value ? $t('dp.active') : $t('dp.inactive')"
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
import {
  GET_Points,
  GET_PointsChannel,
  GET_DPChannels,
} from "@/api/deliverypoints/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "PointList",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const { search, debouncedFetch } = useSearchDebounce();
    return { loader, notify, search, debouncedFetch };
  },
  data() {
    return {
      points: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      ordering: null,
      loading: false,
      activeFilter: "all",
      channelFilter: "__all",
      channels: [],
    };
  },
  computed: {
    channelFilterOptions() {
      const opts = [{ label: this.$t("dp.all_channels"), value: "__all" }];
      for (const ch of this.channels) {
        opts.push({ label: ch.name || ch.idx, value: ch.idx });
      }
      return opts;
    },
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("dp.create_point"),
          handler: () => this.$router.push("/points/create"),
        },
      ];
    },
    filterTabs() {
      return [
        { key: "all", label: this.$t("dp.filter_all") },
        { key: "active", label: this.$t("dp.filter_active") },
        { key: "inactive", label: this.$t("dp.filter_inactive") },
        { key: "carrier", label: this.$t("dp.filter_carrier") },
        { key: "custom", label: this.$t("dp.filter_custom") },
      ];
    },
    columns() {
      return [
        {
          key: "code",
          label: this.$t("dp.code"),
          sortable: true,
          width: "1fr",
        },
        {
          key: "name",
          label: this.$t("dp.name"),
          sortable: true,
          width: "2fr",
        },
        {
          key: "type_name",
          label: this.$t("dp.type"),
          sortable: false,
          width: "160px",
        },
        {
          key: "city",
          label: this.$t("dp.city"),
          sortable: true,
          width: "1fr",
        },
        {
          key: "is_active",
          label: this.$t("dp.status"),
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
      this.fetchPoints();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchChannels();
    this.fetchPoints();
  },
  methods: {
    async fetchChannels() {
      try {
        const { data } = await GET_DPChannels({ page_size: 100 });
        this.channels = data.results || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    onChannelFilter(val) {
      this.channelFilter = val;
      this.currentPage = 1;
      this.fetchPoints();
    },
    async fetchPoints() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.ordering) params.ordering = this.ordering;

        if (this.activeFilter === "active") {
          params.is_active = true;
        } else if (this.activeFilter === "inactive") {
          params.is_active = false;
        } else if (this.activeFilter === "carrier") {
          params.type = "carrier";
        } else if (this.activeFilter === "custom") {
          params.type = "custom";
        }

        const { data } =
          this.channelFilter !== "__all"
            ? await GET_PointsChannel(this.channelFilter, params)
            : await GET_Points(params);
        this.points = data.results || [];
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
      this.fetchPoints();
    },
    searchAndFetch() {
      this.currentPage = 1;
      this.fetchPoints();
    },
    onSort({ key, direction }) {
      if (!key || key === "type_name") {
        this.ordering = null;
      } else {
        this.ordering = direction === "desc" ? `-${key}` : key;
      }
      this.fetchPoints();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/points/${row.id}`);
    },
  },
};
</script>

<style lang="scss" scoped>
.point-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}
.point-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}

.point-list__channel {
  min-width: 150px;
  max-width: 200px;
  flex-shrink: 0;
}

</style>
