<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("authors.title") }}</h1>
      </div>

      <div
        v-if="unavailable"
        class="flex ai-ct jc-ct gap-200 p-500 t-basic-500"
        style="min-height: 14rem; flex-direction: column"
      >
        <p class="fs-400 fw-600 t-basic-600">
          {{ $t("authors.unavailable_title") }}
        </p>
        <p class="fs-200 t-basic-500 ta-ct" style="max-width: 30rem">
          {{ $t("authors.unavailable_msg") }}
        </p>
      </div>

      <template v-if="!unavailable">
      <div class="flex ai-ct mb-400">
        <MobileFilterPanel
          :active-count="activeFilterCount"
          :trigger-label="$t('builder.filters')"
        >
          <p class="fs-200 t-basic-600">{{ $t("builder.filters") }}</p>
          <FilterChip
            :label="$t('pim.all')"
            :active="isActiveFilter === null"
            @click="onFilterActive(null)"
          />
          <FilterChip
            :label="$t('pim.active')"
            :active="isActiveFilter === true"
            @click="onFilterActive(true)"
          />
          <FilterChip
            :label="$t('pim.inactive')"
            :active="isActiveFilter === false"
            @click="onFilterActive(false)"
          />
        </MobileFilterPanel>
      </div>

      <div class="author-list__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="author-list__search"
          @input="debouncedFetch(searchAndFetch)"
        />
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="authors"
        row-key="uid"
        :empty-text="$t('authors.no_authors')"
        @row-click="onRowClick"
      >
        <template #cell-name="{ row }">
          <span class="author-list__name-cell">{{ row.name }}</span>
        </template>
        <template #cell-role="{ row }">
          <span class="t-basic-600">{{ resolveRole(row) }}</span>
        </template>
        <template #cell-is_active="{ value }">
          <StatusBadge
            :label="value ? $t('pim.active') : $t('pim.inactive')"
            :variant="value ? 'positive' : 'negative'"
          />
        </template>
        <template #cell-post_count="{ value }">
          <span class="t-basic-600">{{ value ?? 0 }}</span>
        </template>
      </DataTable>

      <Pagination
        v-if="totalCount > pageSize"
        :pagination="paginationState"
        class="mt-200"
        @onChangePage="onPageChange"
      />
    </template>
    </div>

    <FloatingActions v-if="!unavailable" :actions="fabActions" />
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { GET_Authors } from "@/api/contentDB/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "AuthorList",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const { search, debouncedFetch } = useSearchDebounce();
    return { loader, notify, search, debouncedFetch };
  },
  data() {
    return {
      authors: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      isActiveFilter: null,
      loading: false,
      unavailable: false,
    };
  },
  computed: {
    activeFilterCount() {
      return this.isActiveFilter !== null ? 1 : 0;
    },
    columns() {
      return [
        { key: "name", label: this.$t("authors.name"), width: "1fr" },
        { key: "slug", label: this.$t("authors.slug"), width: "160px" },
        { key: "role", label: this.$t("authors.role"), width: "160px" },
        {
          key: "is_active",
          label: this.$t("authors.is_active"),
          width: "100px",
        },
        {
          key: "post_count",
          label: this.$t("authors.post_count"),
          width: "120px",
        },
      ];
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.ceil(this.totalCount / this.pageSize),
      };
    },
    currentLang() {
      return (this.$i18n?.locale || "en").toLowerCase();
    },
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("authors.create"),
          handler: () => this.$router.push("/pages/authors/create"),
        },
      ];
    },
  },
  watch: {
    "$route.query.page"(newPage) {
      this.currentPage = parseInt(newPage) || 1;
      this.fetchAuthors();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchAuthors();
  },
  methods: {
    resolveRole(row) {
      if (!row.role_t9n) return "";
      return (
        row.role_t9n[this.currentLang] || Object.values(row.role_t9n)[0] || ""
      );
    },
    async fetchAuthors() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.isActiveFilter !== null)
          params.is_active = this.isActiveFilter;

        const { data } = await GET_Authors(params);
        this.authors = data.results || [];
        this.totalCount = data.count || 0;
      } catch (err) {
        if (
          err?.response?.status === 404 ||
          err?.response?.status === 500 ||
          err?.error === "NOT_FOUND" ||
          err?.error === "INTERNAL_ERROR"
        ) {
          this.unavailable = true;
          return;
        }
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
      this.fetchAuthors();
    },
    onFilterActive(val) {
      this.isActiveFilter = val;
      this.currentPage = 1;
      this.fetchAuthors();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/pages/authors/${row.uid}`);
    },
  },
};
</script>

<style lang="scss" scoped>
.author-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}
.author-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}
.author-list__name-cell {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media only screen and (max-width: 768px) {
  .p-500 {
    padding: 16px !important;
  }
}
</style>
