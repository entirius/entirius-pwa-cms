<template>
  <div class="pim-list-layout p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 flex-1 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("pim.feature_sets") }}</h1>
      </div>

      <div class="feature-set-list__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="feature-set-list__search"
          @input="debouncedFetch(searchAndFetch)"
        />
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="featureSets"
        :sortable="true"
        row-key="idx"
        :empty-text="$t('pim.no_feature_sets')"
        @sort="onSort"
        @row-click="onRowClick"
      >
        <template #cell-is_default="{ value }">
          <span
            class="chip"
            :class="
              value
                ? 'bg-positive-100 t-positive-300'
                : 'bg-basic-200 t-basic-500'
            "
          >
            {{ value ? $t("pim.yes") : $t("pim.no") }}
          </span>
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
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { GET_FeatureSetsGlobal, POST_FeatureSet } from "@/api/pim/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "FeatureSetList",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
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
    return { loader, notify, search, debouncedFetch };
  },
  data() {
    return {
      featureSets: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      ordering: null,
      loading: false,
    };
  },
  computed: {
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("pim.create_feature_set"),
          handler: () => this.onCreate(),
        },
      ];
    },
    columns() {
      return [
        { key: "idx", label: "IDX", sortable: true, width: "1fr" },
        {
          key: "name",
          label: this.$t("pim.name"),
          sortable: true,
          width: "2fr",
        },
        {
          key: "desc",
          label: this.$t("pim.description"),
          sortable: false,
          width: "2fr",
        },
        {
          key: "is_default",
          label: this.$t("pim.is_default"),
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
      this.fetchFeatureSets();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchFeatureSets();
  },
  methods: {
    async fetchFeatureSets() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.ordering) params.ordering = this.ordering;

        const { data } = await GET_FeatureSetsGlobal(params);
        this.featureSets = data.results || [];
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
      this.fetchFeatureSets();
    },
    onSort({ key, direction }) {
      if (!key) {
        this.ordering = null;
      } else {
        this.ordering = direction === "desc" ? `-${key}` : key;
      }
      this.fetchFeatureSets();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/pim/feature-sets/${row.idx}`);
    },
    async onCreate() {
      const idx = `new-set-${Date.now()}`;
      this.loader.loaderStart();
      try {
        await POST_FeatureSet({ idx, name: "New Attribute Set" });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.feature_set_created"),
        });
        this.$router.push(`/pim/feature-sets/${idx}`);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.pim-list-layout {
  display: flex;
  flex-direction: column;
}
.feature-set-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}
.feature-set-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}
</style>
