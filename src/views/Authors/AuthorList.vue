<template>
  <div class="p-12 fs-300 t-body h-100 ov-h">
    <div
      class="page-card h-100 ovy-auto"
    >
      <div class="flex ai-ct mb-10">
        <h1>{{ $t("authors.title") }}</h1>
      </div>

      <div
        v-if="unavailable"
        class="flex ai-ct jc-ct gap-5 p-12 t-muted"
        style="min-height: 14rem; flex-direction: column"
      >
        <p class="fs-400 fw-600 t-secondary">
          {{ $t("authors.unavailable_title") }}
        </p>
        <p class="fs-200 t-muted ta-ct" style="max-width: 30rem">
          {{ $t("authors.unavailable_msg") }}
        </p>
      </div>

      <template v-if="!unavailable">
      <div class="flex ai-ct mb-10">
        <MobileFilterPanel
          :active-count="activeFilterCount"
          :trigger-label="$t('builder.filters')"
        >
          <p class="fs-200 t-secondary">{{ $t("builder.filters") }}</p>
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

      <Loader block v-show="loading" />

      <DataTable
        empty-size="md"
        v-show="!loading"
        :columns="columns"
        :rows="authors"
        row-key="uid"
        :empty-text="$t('authors.no_authors')"
        @row-click="onRowClick"
      >
        <template #cell-role="{ row }">
          <span class="t-secondary">{{ resolveRole(row) }}</span>
        </template>
        <template #cell-is_active="{ value }">
          <StatusBadge
            :label="value ? $t('pim.active') : $t('pim.inactive')"
            :variant="value ? 'positive' : 'negative'"
          />
        </template>
        <template #cell-post_count="{ value }">
          <span class="t-secondary">{{ value ?? 0 }}</span>
        </template>
      </DataTable>

      <Pagination
        v-if="totalCount > pageSize"
        :pagination="paginationState"
        class="mt-5"
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
        { key: "name", label: this.$t("authors.name"), width: "1fr", truncate: true },
        { key: "slug", label: this.$t("authors.slug"), width: "160px", priority: 2 },
        { key: "role", label: this.$t("authors.role"), width: "160px", priority: 2 },
        {
          key: "is_active",
          label: this.$t("authors.is_active"),
          width: "100px",
        },
        {
          key: "post_count",
          label: this.$t("authors.post_count"),
          width: "120px",
          priority: 2,
          numeric: true,
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
  gap: var(--space-5);
  margin-bottom: var(--space-10);
  flex-wrap: wrap;
}
.author-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}
@media only screen and (max-width: 768px) {
  .p-12 {
    padding: var(--space-4) !important;
  }
}
</style>
