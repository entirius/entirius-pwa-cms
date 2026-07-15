<template>
  <div class="pim-list-layout p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 flex-1 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("pim.gap_definitions") }}</h1>
      </div>

      <GapStatusAlert />

      <QualitySettingsCard />

      <div class="gap-def-list__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="gap-def-list__search"
          @input="debouncedFetch(searchAndFetch)"
        />
        <FilterChip
          :label="$t('pim.gap_only_active')"
          :active="onlyActive"
          data-test="gap-only-active"
          @click="toggleOnlyActive"
        />
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="rules"
        :sortable="true"
        row-key="key"
        :empty-text="$t('pim.no_gap_definitions')"
        @sort="onSort"
        @row-click="onRowClick"
      >
        <template #cell-severity="{ row }">
          <StatusBadge
            :label="severityLabel(row.severity)"
            :variant="severityVariant(row.severity)"
          />
        </template>
        <template #cell-check_key="{ value }">
          <span class="t-basic-600">{{ checkLabel(value) }}</span>
        </template>
        <template #cell-label_t9n="{ row }">
          <span>{{ resolveLabel(row) }}</span>
        </template>
        <template #cell-active="{ value }">
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
import { useQualityStore } from "@/stores/quality";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { GET_GapDefinitions } from "@/api/pim/api";
import { gapBadgeVariant, resolveGapLabel } from "./quality";
import { getLang } from "@/i18n";
import GapStatusAlert from "./components/GapStatusAlert.vue";
import QualitySettingsCard from "./components/QualitySettingsCard.vue";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "GapDefinitionList",
  components: { GapStatusAlert, QualitySettingsCard },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const quality = useQualityStore();
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
    return { loader, notify, quality, search, debouncedFetch };
  },
  data() {
    return {
      rules: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      ordering: "display_order",
      onlyActive: false,
      loading: false,
    };
  },
  computed: {
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("pim.create_gap_definition"),
          handler: () => this.$router.push("/pim/gap-definitions/create"),
        },
      ];
    },
    columns() {
      return [
        { key: "key", label: this.$t("pim.gap_key"), sortable: true, width: "1.5fr" },
        { key: "check_key", label: this.$t("pim.gap_check"), sortable: false, width: "1.5fr" },
        { key: "label_t9n", label: this.$t("pim.gap_label"), sortable: false, width: "2fr" },
        { key: "severity", label: this.$t("pim.gap_severity"), sortable: true, width: "120px" },
        { key: "active", label: this.$t("pim.gap_active"), sortable: false, width: "90px" },
        { key: "display_order", label: this.$t("pim.gap_order"), sortable: true, width: "90px" },
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
      this.fetchRules();
    },
  },
  async mounted() {
    // Soft-compat self-guard: if the gaps API is absent, leave quietly (no screen).
    if (this.quality.available === null) await this.quality.probe();
    if (this.quality.available === false) {
      this.$router.replace("/pim/products");
      return;
    }
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchRules();
  },
  methods: {
    severityLabel(severity) {
      return severity === "warning"
        ? this.$t("pim.gap_warning")
        : this.$t("pim.gap_critical");
    },
    severityVariant(severity) {
      return gapBadgeVariant(severity);
    },
    checkLabel(checkKey) {
      const key = `pim.gap_check_${checkKey}`;
      const label = this.$t(key);
      return label === key ? checkKey : label;
    },
    resolveLabel(row) {
      // Reuse the shared finding-label resolver; a rule's key plays the definition_key fallback.
      return resolveGapLabel({ label_t9n: row.label_t9n, definition_key: row.key }, getLang());
    },
    async fetchRules() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.ordering) params.ordering = this.ordering;
        if (this.onlyActive) params.is_active = true;

        const { data } = await GET_GapDefinitions(params);
        this.rules = data.results || [];
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
      this.fetchRules();
    },
    toggleOnlyActive() {
      this.onlyActive = !this.onlyActive;
      this.searchAndFetch();
    },
    onSort({ key, direction }) {
      this.ordering = !key ? null : direction === "desc" ? `-${key}` : key;
      this.fetchRules();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/pim/gap-definitions/${row.key}`);
    },
  },
};
</script>

<style lang="scss" scoped>
.pim-list-layout {
  display: flex;
  flex-direction: column;
}
.gap-def-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}
.gap-def-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}
</style>
