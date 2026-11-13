<template>
  <PageLayout data-testid="leads-reports">
    <template #header>
      <PageHeader :title="$t('leads.reports.title')" />
    </template>
    <template #toolbar>
      <div class="flex ai-fe flex-wrap gap-5">
        <BasicSelect v-model="origin" :floating-label="$t('leads.reports.origin')" :options="originOptions" data-testid="reports-origin" />
        <FormField class="reports__period" :label="$t('leads.reports.period')">
          <BasicDatePicker v-model="period" :config="{ mode: 'range', locale: { rangeSeparator: RANGE_SEPARATOR } }" data-testid="reports-period" />
        </FormField>
      </div>
    </template>
    <Loader v-if="loading && !report" block />
    <p v-else-if="error && !report" class="t-negative m-0" role="alert" data-testid="reports-error">{{ error }}</p>
    <EmptyState v-else-if="!report || !hasCompanies" icon="empty" size="md" :title="$t('leads.reports.empty')" data-testid="reports-empty" />
    <div v-else class="flex-column gap-8">
      <BasicCard :title="$t('leads.reports.stages')">
        <DataTable :columns="stageColumns" :rows="stageRows" row-key="key" :row-attrs="stageAttrs" data-testid="reports-stages" />
      </BasicCard>
      <BasicCard :title="$t('leads.reports.moves')">
        <DataTable :columns="moveColumns" :rows="moveRows" row-key="pair" :row-attrs="() => ({ 'data-testid': 'reports-move-row' })" :empty-text="$t('leads.reports.no_moves')" data-testid="reports-moves" />
      </BasicCard>
      <BasicCard :title="$t('leads.reports.origins')">
        <DataTable :columns="originColumns" :rows="originRows" row-key="key" data-testid="reports-origins" />
      </BasicCard>
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { t } from "@/i18n";
import { GET_Funnel } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { durationLabel } from "./reports";

// Reports (ux/screens/reports.md): the funnel as three tables — stages now / entered / left / mean time, the moves
// between stages, companies per origin. Origin and period reload it; the default period is the last 30 days.
const DAY_MS = 86400000;
const RANGE_SEPARATOR = " – "; // fixed, so the Polish locale (" do ") never changes what is parsed
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const notify = useNotifyStore();
const report = ref(null);
const loading = ref(true);
const origin = ref("");
const period = ref(`${isoDay(Date.now() - 30 * DAY_MS)}${RANGE_SEPARATOR}${isoDay(Date.now())}`);
const origins = ref([]);
const error = ref("");

const originOptions = computed(() => [
  { value: "", label: t("leads.reports.origin_all") },
  ...origins.value.filter(Boolean).map((value) => ({ value, label: value })),
]);
const hasCompanies = computed(() => report.value.stages.some((stage) => stage.current) || report.value.origins.length);
const labelOf = (key) => report.value.stages.find((stage) => stage.key === key)?.label || key;

const stageColumns = [
  { key: "label", label: t("leads.reports.col_stage"), width: "1fr" },
  { key: "current", label: t("leads.reports.col_now"), numeric: true },
  { key: "entered", label: t("leads.reports.col_entered"), numeric: true },
  { key: "left", label: t("leads.reports.col_left"), numeric: true },
  { key: "mean", label: t("leads.reports.col_mean"), numeric: true },
];
const moveColumns = [
  { key: "move", label: t("leads.reports.col_move"), width: "1fr" },
  { key: "count", label: t("leads.reports.col_companies"), numeric: true },
  { key: "mean", label: t("leads.reports.col_mean_before"), numeric: true },
];
const originColumns = [
  { key: "label", label: t("leads.reports.origin"), width: "1fr" },
  { key: "companies", label: t("leads.reports.col_companies"), numeric: true },
];
const stageRows = computed(() => report.value.stages.map((stage) => ({ ...stage, mean: durationLabel(stage.mean_seconds) })));
const stageAttrs = (row) => ({ "data-testid": "reports-stage-row", "data-stage": row.key });
const moveRows = computed(() =>
  report.value.transitions.map((move) => ({
    pair: `${move.from_stage}>${move.to_stage}`,
    move: `${labelOf(move.from_stage)} → ${labelOf(move.to_stage)}`,
    count: move.count,
    mean: durationLabel(move.mean_seconds),
  }))
);
const originRows = computed(() =>
  report.value.origins.map((row) => ({ key: row.origin || "-", label: row.origin || t("leads.reports.origin_none"), companies: row.companies }))
);

function params() {
  const [from, to] = (period.value || "").split(RANGE_SEPARATOR);
  return { origin: origin.value, date_from: from || undefined, date_to: to || from || undefined };
}

// A failure keeps the last answer on screen (toast only).
async function load() {
  loading.value = true;
  try {
    report.value = (await GET_Funnel(params())).data;
    error.value = "";
    if (!origin.value) origins.value = report.value.origins.map((row) => row.origin);
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.common.error"));
    notify.spawnNotification({ msg: error.value, type: "negative" });
  } finally {
    loading.value = false;
  }
}

watch([origin, period], load);
onMounted(load);
</script>

<style scoped>
.reports__period {
  width: 18rem;
}
</style>
