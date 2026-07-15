<template>
  <div class="pim-list-layout p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 flex-1 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("pim.features") }}</h1>
      </div>

      <div class="feature-list__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="feature-list__search"
          @input="debouncedFetch(searchAndFetch)"
        />
        <MobileFilterPanel
          :active-count="activeFilterCount"
          :trigger-label="$t('builder.filters')"
        >
          <Dropdown
            :values="typeFilterOptions"
            :placeholder="$t('pim.feature_type')"
            @onSelect="onFilterType"
          />
          <Dropdown
            :values="scopeFilterOptions"
            :placeholder="$t('pim.scope')"
            @onSelect="onFilterScope"
          />
        </MobileFilterPanel>
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="features"
        :sortable="true"
        row-key="idx"
        :empty-text="$t('pim.no_features')"
        @sort="onSort"
        @row-click="onRowClick"
      >
        <template #cell-name="{ row }">
          <span class="feature-list__name-cell">
            {{
              row.name ||
              (row.name_t9n && (row.name_t9n.en || row.name_t9n.pl)) ||
              row.idx
            }}
          </span>
        </template>
        <template #cell-feature_type="{ value }">
          <span class="chip bg-basic-200 t-basic-600">
            {{ $t(featureTypeLabel(value)) }}
          </span>
        </template>
        <template #cell-scope="{ value }">
          {{ $t(scopeLabel(value)) }}
        </template>
      </DataTable>

      <FloatingActions :actions="fabActions" />
    </div>
    <Pagination
      v-if="totalCount > pageSize"
      :pagination="paginationState"
      class="mt-200"
      @onChangePage="onPageChange"
    />
  </div>
</template>

<script>
import { inject, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { GET_Features } from "@/api/pim/api";
import {
  FEATURE_TYPES,
  FILTER_SCOPES,
  featureTypeLabel,
  scopeLabel,
} from "./helpers/pimEnums";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "FeatureList",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    const { search, debouncedFetch } = useSearchDebounce();
    const isGlobalScope = inject("isGlobalScope", null);
    onMounted(() => {
      nextTick(() => {
        if (isGlobalScope) isGlobalScope.value = true;
      });
    });
    onBeforeUnmount(() => {
      if (isGlobalScope) isGlobalScope.value = false;
    });
    return { loader, notify, pimChannel, search, debouncedFetch };
  },
  data() {
    return {
      features: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      typeFilter: null,
      scopeFilter: null,
      ordering: null,
      loading: false,
    };
  },
  computed: {
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("pim.create_feature"),
          handler: () => this.onCreate(),
        },
      ];
    },
    activeFilterCount() {
      let count = 0;
      if (this.typeFilter !== null) count++;
      if (this.scopeFilter !== null) count++;
      return count;
    },
    columns() {
      return [
        { key: "idx", label: "IDX", sortable: true, width: "160px" },
        {
          key: "name",
          label: this.$t("pim.name"),
          sortable: false,
          width: "1fr",
        },
        {
          key: "feature_type",
          label: this.$t("pim.feature_type"),
          sortable: true,
          width: "120px",
        },
        {
          key: "scope",
          label: this.$t("pim.scope"),
          sortable: true,
          width: "120px",
        },
        {
          key: "attribute_count",
          label: this.$t("pim.options"),
          sortable: false,
          width: "80px",
        },
      ];
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.ceil(this.totalCount / this.pageSize),
      };
    },
    typeFilterOptions() {
      return [
        { label: this.$t("pim.all"), value: null },
        ...FEATURE_TYPES.map((ft) => ({
          label: this.$t(ft.labelKey),
          value: ft.value,
        })),
      ];
    },
    scopeFilterOptions() {
      return [
        { label: this.$t("pim.all"), value: null },
        ...FILTER_SCOPES.map((s) => ({
          label: this.$t(s.labelKey),
          value: s.value,
        })),
      ];
    },
  },
  watch: {
    "$route.query.page"(newPage) {
      this.currentPage = parseInt(newPage) || 1;
      this.fetchFeatures();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchFeatures();
  },
  methods: {
    featureTypeLabel,
    scopeLabel,
    async fetchFeatures() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.typeFilter !== null) params.feature_type = this.typeFilter;
        if (this.scopeFilter !== null) params.scope = this.scopeFilter;
        if (this.ordering) params.ordering = this.ordering;

        const { data } = await GET_Features(
          params,
          this.pimChannel.activeChannelIdx
        );
        this.features = data.results || [];
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
    searchAndFetch() {
      this.currentPage = 1;
      this.fetchFeatures();
    },
    onFilterType(val) {
      this.typeFilter = val;
      this.currentPage = 1;
      this.fetchFeatures();
    },
    onFilterScope(val) {
      this.scopeFilter = val;
      this.currentPage = 1;
      this.fetchFeatures();
    },
    onSort({ key, direction }) {
      if (!key) {
        this.ordering = null;
      } else {
        this.ordering = direction === "desc" ? `-${key}` : key;
      }
      this.fetchFeatures();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/pim/features/${row.idx}`);
    },
    onCreate() {
      this.$router.push("/pim/features/create");
    },
  },
};
</script>

<style lang="scss" scoped>
.pim-list-layout {
  display: flex;
  flex-direction: column;
}
.feature-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}
.feature-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}
.feature-list__name-cell {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media only screen and (max-width: 768px) {
  .pim-list-layout {
    padding: 16px !important;
    overflow-x: visible !important;

    > div {
      overflow-x: visible !important;
    }
  }
}
</style>
