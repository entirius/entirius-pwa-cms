<template>
  <PageLayout class="comfy-results fs-300 t-body">
    <template #header>
      <PageHeader :title="$t('enrichment.review.title')" :crumbs="[]">
        <template #tabs>
          <RouteTabs :tabs="ENRICHMENT_REVIEW_TABS" />
        </template>
      </PageHeader>
    </template>
    <template #toolbar>
      <div class="flex ai-ct flex-wrap gap-5">
        <BasicSelect
          :model-value="filters.worker"
          :options="workerOptions"
          :floating-label="$t('enrichment.checks.worker')"
          class="comfy-results__select"
          data-testid="checks-worker"
          @update:model-value="(value) => setFilter({ worker: value })"
        />
        <BasicInput
          v-model="skuInput"
          :placeholder="$t('enrichment.checks.sku')"
          icon="search"
          class="comfy-results__search"
          data-testid="checks-sku"
          @input="debouncedFetch(applySku)"
        />
        <MobileFilterPanel :active-count="panelFilterCount" :trigger-label="$t('pim.filters')">
          <BasicSelect
            :model-value="filters.source"
            :options="sourceOptions"
            :floating-label="$t('enrichment.checks.source')"
            class="comfy-results__select"
            data-testid="checks-source"
            @update:model-value="(value) => setFilter({ source: value })"
          />
          <BasicInput
            v-model="reasonInput"
            :placeholder="$t('enrichment.checks.reason')"
            class="comfy-results__search"
            data-testid="checks-reason"
            @input="debouncedFetch(applyReason)"
          />
          <BasicSelect
            :model-value="effectiveSort(filters)"
            :options="sortOptions"
            :floating-label="$t('enrichment.checks.sort')"
            class="comfy-results__select"
            data-testid="checks-sort"
            @update:model-value="(value) => setFilter({ sort: value })"
          />
        </MobileFilterPanel>
        <span class="fs-200 t-muted ml-auto">{{ $t("enrichment.tasks.matching", { count }) }}</span>
      </div>
      <div class="filter-chip-row" role="group" :aria-label="$t('enrichment.checks.verdict')">
        <FilterChip
          v-if="filters.task"
          :label="$t('enrichment.checks.task_chip', { id: filters.task })"
          active
          data-testid="checks-task-chip"
          @click="setFilter({ task: '' })"
        />
        <FilterChip
          v-for="chip in chips"
          :key="chip.value || 'all'"
          :label="`${chipLabel(chip.value)} (${chip.count})`"
          :active="filters.verdict === chip.value"
          :data-testid="`checks-verdict-${chip.value || 'all'}`"
          @click="setFilter({ verdict: chip.value })"
        />
      </div>
    </template>

    <div class="flex-column gap-8" v-bind="tabPanel">
      <Loader block v-show="loading" />
      <DataTable
        v-show="!loading"
        empty-size="md"
        :columns="columns"
        :rows="rows"
        row-key="id"
        :empty-text="$t('enrichment.checks.empty')"
      >
        <template #empty>
          <EmptyState icon="empty" size="md" :title="$t('enrichment.checks.empty')" data-testid="checks-empty">
            <BasicButton v-if="hasFilters" data-testid="checks-clear" @click="clearFilters">
              {{ $t("pim.clear_filters") }}
            </BasicButton>
          </EmptyState>
        </template>
        <template #cell-thumbnail="{ row }">
          <div class="comfy-results__thumb">
            <img v-if="row.thumbnail_url" :src="resolveMediaUrl(row.thumbnail_url)" :alt="row.subject_ref" class="comfy-results__img" />
            <FontAwesomeIcon v-else :icon="$icons.image" class="t-muted" />
          </div>
        </template>
        <template #cell-subject_ref="{ row }">
          <router-link :to="{ name: 'PimProductDetail', params: { sku: row.subject_ref } }" class="t-accent fw-600">
            {{ row.subject_ref }}
          </router-link>
        </template>
        <template #cell-verdict="{ row }">
          <StatusBadge :label="verdictLabel(row.verdict)" :tone="verdictTone(row.verdict)" />
        </template>
        <template #cell-reason="{ row }">{{ row.reason || "—" }}</template>
        <template #cell-score="{ row }">{{ row.score == null ? "—" : row.score.toFixed(3) }}</template>
        <template #cell-metrics="{ row }">
          <span class="fs-200 t-muted">{{ formatMetrics(row.metrics) || "—" }}</span>
        </template>
        <template #cell-source="{ row }">{{ $t(`enrichment.checks.sources.${row.source}`) }}</template>
        <template #cell-checked_at="{ row }">
          <span class="fs-200 t-muted">{{ formatDate(row.checked_at) }}</span>
        </template>
        <template #cell-task_id="{ row }">
          <router-link v-if="row.task_id" :to="{ name: 'EnrichmentRuns', query: { task: row.task_id } }" class="t-accent">
            #{{ row.task_id }}
          </router-link>
          <span v-else class="t-muted">—</span>
        </template>
      </DataTable>
    </div>

    <template v-if="count > PAGE_SIZE" #footer>
      <Pagination :page="filters.page" :pages="Math.ceil(count / PAGE_SIZE)" @update:page="(page) => setFilter({ page }, false)" />
    </template>
  </PageLayout>
</template>

<script setup>
// Enricher → Review → Picture checks (enrichment >= 2.5.0): the verdicts the comfy workers stored, one row per picture
// checked. Filters live in the URL query (comfyResults.js), so a run's "Results" link and a reload land on the same view.
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import RouteTabs from "@/components/Navigation/RouteTabs.vue";
import { ENRICHMENT_REVIEW_TABS, routeTabPanel } from "@/components/Navigation/nav-routes";
import { useNotifyStore } from "@/stores/notify";
import { notifyApiError } from "@/composables/useNotify";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { GET_ComfyResults, GET_ComfyVerdicts, GET_Workers } from "@/api/enrichment/api";
import { listOf } from "@/api/enrichment/listOf";
import { formatDate } from "@/utils/format";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";
import { t } from "@/i18n";
import {
  DEFAULT_SORT, PAGE_SIZE, SOURCES, VERDICTS, effectiveSort, filtersToQuery, formatMetrics, queryToFilters,
  resultsParams, totalsParams, verdictChips, verdictTone,
} from "./comfyResults";

const route = useRoute();
const router = useRouter();
const notify = useNotifyStore();
const tabPanel = routeTabPanel(ENRICHMENT_REVIEW_TABS, "EnrichmentChecks");
const { debouncedFetch } = useSearchDebounce();

const filters = ref(queryToFilters(route.query));
const skuInput = ref(filters.value.sku);
const reasonInput = ref(filters.value.reason);
const workers = ref([]);
const rows = ref([]);
const count = ref(0);
const totals = ref(null);
const loading = ref(false);
let seq = 0;

const chips = computed(() => verdictChips(totals.value));
const hasFilters = computed(() => !!(filters.value.verdict || filters.value.source || filters.value.reason || filters.value.sku || filters.value.task));
const panelFilterCount = computed(() => [filters.value.source, filters.value.reason, filters.value.sort !== DEFAULT_SORT].filter(Boolean).length);
const workerOptions = computed(() => [
  { value: "", label: t("enrichment.checks.all_workers") },
  ...workers.value.map((w) => ({ value: w.key, label: w.label || w.key })),
]);
const sourceOptions = computed(() => [
  { value: "", label: t("common.all") },
  ...SOURCES.map((value) => ({ value, label: t(`enrichment.checks.sources.${value}`) })),
]);
// Score sorts need a worker: without one the list can only run newest first.
const sortOptions = computed(() => [
  { value: DEFAULT_SORT, label: t("enrichment.checks.sort_newest") },
  ...(filters.value.worker
    ? [
        { value: "score", label: t("enrichment.checks.sort_score_asc") },
        { value: "-score", label: t("enrichment.checks.sort_score_desc") },
      ]
    : []),
]);
const columns = computed(() => [
  { key: "thumbnail", label: "", width: "60px", priority: 2 },
  { key: "subject_ref", label: t("enrichment.checks.col_sku"), width: "minmax(120px, 1fr)" },
  { key: "verdict", label: t("enrichment.checks.verdict"), width: "max-content" },
  { key: "reason", label: t("enrichment.checks.reason"), width: "minmax(100px, 1fr)", priority: 2 },
  { key: "score", label: t("enrichment.checks.col_score"), width: "80px", priority: 2 },
  { key: "metrics", label: t("enrichment.checks.col_metrics"), width: "minmax(140px, 2fr)", priority: 3 },
  { key: "source", label: t("enrichment.checks.source"), width: "max-content", priority: 3 },
  { key: "checked_at", label: t("enrichment.checks.col_checked"), width: "max-content", priority: 2 },
  { key: "task_id", label: t("enrichment.checks.col_task"), width: "80px", priority: 3 },
]);

const chipLabel = (verdict) => (verdict ? verdictLabel(verdict) : t("common.all"));
const verdictLabel = (verdict) => (VERDICTS.includes(verdict) ? t(`enrichment.tasks.counts.${verdict}`) : verdict);

function setFilter(patch, resetPage = true) {
  const next = { ...filters.value, ...patch, ...(resetPage ? { page: 1 } : {}) };
  // A different worker may not have the score order the list was on.
  if (patch.worker !== undefined && !next.worker && next.sort !== DEFAULT_SORT) next.sort = DEFAULT_SORT;
  router.replace({ path: route.path, query: filtersToQuery(next) });
}
const applySku = () => setFilter({ sku: skuInput.value.trim() });
const applyReason = () => setFilter({ reason: reasonInput.value.trim() });
function clearFilters() {
  skuInput.value = "";
  reasonInput.value = "";
  setFilter({ verdict: "", source: "", reason: "", sku: "", task: "" });
}

async function load() {
  const mine = ++seq;
  loading.value = true;
  try {
    const [list, verdicts] = await Promise.all([
      GET_ComfyResults(resultsParams(filters.value)),
      GET_ComfyVerdicts(totalsParams(filters.value)),
    ]);
    if (mine !== seq) return;
    rows.value = list.data.results || [];
    count.value = list.data.count || 0;
    totals.value = verdicts.data;
  } catch (err) {
    if (mine === seq) notifyApiError(notify, err, t("notifications.error"));
  } finally {
    if (mine === seq) loading.value = false;
  }
}

// The comfy workers fill the worker select; the only one is picked for the operator.
async function loadWorkers() {
  try {
    const { data } = await GET_Workers();
    workers.value = listOf(data).filter((w) => w.kind === "comfy");
  } catch (err) {
    notifyApiError(notify, err, t("notifications.error"));
  }
  if (!filters.value.worker && workers.value.length === 1) setFilter({ worker: workers.value[0].key });
}

watch(
  () => route.query,
  (query) => {
    if (route.name !== "EnrichmentChecks") return;
    filters.value = queryToFilters(query);
    skuInput.value = filters.value.sku;
    reasonInput.value = filters.value.reason;
    load();
  }
);
onMounted(() => {
  load();
  loadWorkers();
});
</script>

<style lang="scss" scoped>
.comfy-results {
  display: flex;
  flex-direction: column;
}
.comfy-results__select {
  flex: 0 1 220px;
  min-width: 150px;
}
.comfy-results__search {
  flex: 0 1 240px;
  min-width: 150px;
}
.comfy-results__thumb {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-base);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-raised);
}
.comfy-results__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
