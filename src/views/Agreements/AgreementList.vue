<template>
  <div class="agm-list__wrapper p-12 fs-300 t-body h-100 ov-h">
    <div
      class="page-card h-100 ovy-auto"
    >
      <div class="flex ai-ct mb-10">
        <h1>{{ $t("agm.definitions") }}</h1>
      </div>

      <!-- Filter tabs -->
      <div class="flex ai-ct mb-10">
        <MobileFilterPanel
          :active-count="activeFilter !== 'all' ? 1 : 0"
          :trigger-label="$t('builder.filters')"
        >
          <p class="fs-200 t-secondary">{{ $t("builder.filters") }}</p>
          <FilterChip
            v-for="tab in filterTabs"
            :key="tab.key"
            :label="tab.label"
            :active="activeFilter === tab.key"
            @click="setFilter(tab.key)"
          />
        </MobileFilterPanel>
      </div>

      <div class="flex ai-ct gap-8 mb-10">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="agm-list__search"
          @input="debouncedFetch(searchAndFetch)"
        />
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="definitions"
        :sortable="true"
        row-key="slug"
        :empty-text="$t('agm.no_definitions')"
        @sort="onSort"
        @row-click="onRowClick"
      >
        <template #cell-category="{ value }">
          <span v-if="value" class="chip bg-accent-subtle t-strong">
            {{ value }}
          </span>
          <span v-else class="t-muted">---</span>
        </template>
        <template #cell-is_active="{ value }">
          <StatusBadge
            :label="value ? $t('agm.active') : $t('agm.inactive')"
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
import { GET_Definitions } from "@/api/agreements/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "AgreementList",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const { search, debouncedFetch } = useSearchDebounce();
    return { loader, notify, search, debouncedFetch };
  },
  data() {
    return {
      definitions: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      ordering: null,
      loading: false,
      activeFilter: "all",
    };
  },
  computed: {
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("agm.create_definition"),
          handler: () => this.$router.push("/agreements/create"),
        },
      ];
    },
    filterTabs() {
      return [
        { key: "all", label: this.$t("agm.filter_all") },
        { key: "mandatory", label: this.$t("agm.filter_mandatory") },
        { key: "marketing", label: this.$t("agm.filter_marketing") },
        { key: "informational", label: this.$t("agm.filter_informational") },
      ];
    },
    columns() {
      return [
        {
          key: "name",
          label: this.$t("agm.name"),
          sortable: true,
          width: "1fr",
        },
        {
          key: "slug",
          label: this.$t("agm.slug"),
          sortable: false,
          width: "180px",
          priority: 2,
        },
        {
          key: "category",
          label: this.$t("agm.category"),
          sortable: false,
          width: "120px",
          priority: 2,
        },
        {
          key: "consent_channel",
          label: this.$t("agm.consent_channel"),
          sortable: false,
          width: "120px",
          priority: 2,
        },
        {
          key: "is_active",
          label: this.$t("agm.status"),
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
      this.fetchDefinitions();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchDefinitions();
  },
  methods: {
    async fetchDefinitions() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.ordering) params.ordering = this.ordering;
        if (this.activeFilter !== "all") params.category = this.activeFilter;

        const { data } = await GET_Definitions(params);
        this.definitions = data.results || [];
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
      this.fetchDefinitions();
    },
    searchAndFetch() {
      this.currentPage = 1;
      this.fetchDefinitions();
    },
    onSort({ key, direction }) {
      if (!key) {
        this.ordering = null;
      } else {
        this.ordering = direction === "desc" ? `-${key}` : key;
      }
      this.fetchDefinitions();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/agreements/${row.slug}`);
    },
  },
};
</script>

<style lang="scss" scoped>
.agm-list__search {
  flex: 1;
  max-width: 400px;
}

@media only screen and (max-width: 768px) {
  .agm-list__wrapper {
    padding: var(--space-4) !important;
    overflow-x: visible !important;

    > div {
      overflow-x: visible !important;
    }
  }
}

</style>
