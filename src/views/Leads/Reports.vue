<template>
  <PageLayout data-testid="leads-reports">
    <template #header>
      <PageHeader :title="$t('leads.reports.title')" />
    </template>
    <div class="reports flex-column gap-8">
      <BasicCard :title="$t('leads.reports.funnel')" data-testid="report-funnel">
        <div class="flex-column gap-5">
          <p class="t-muted m-0">{{ $t("leads.reports.funnel_help") }}</p>
          <div class="filters">
            <BasicSelect v-model="origin" :options="originOptions" :floating-label="$t('leads.reports.origin')" data-testid="funnel-origin" @update:model-value="loadFunnel" />
            <FormField :label="$t('leads.reports.date_from')">
              <BasicInput v-model="dateFrom" type="date" data-testid="funnel-from" @update:model-value="loadFunnel" />
            </FormField>
            <FormField :label="$t('leads.reports.date_to')">
              <BasicInput v-model="dateTo" type="date" data-testid="funnel-to" @update:model-value="loadFunnel" />
            </FormField>
          </div>
          <p v-if="funnelError" class="t-negative m-0" role="alert" data-testid="funnel-error">{{ funnelError }}</p>
          <template v-if="funnel">
            <p class="m-0" data-testid="funnel-companies">{{ $t("leads.reports.companies", { count: funnel.companies }) }}</p>
            <DataTable :columns="stageColumns" :rows="stageRows" row-key="stage" :row-attrs="(row) => ({ 'data-testid': 'funnel-stage', 'data-stage': row.stage })" />
            <h3 class="fs-400 fw-600 m-0">{{ $t("leads.reports.transitions") }}</h3>
            <DataTable
              :columns="transitionColumns"
              :rows="transitionRows"
              row-key="key"
              :empty-text="$t('leads.reports.empty')"
              :row-attrs="() => ({ 'data-testid': 'funnel-transition' })"
            />
          </template>
          <Loader v-else-if="!funnelError" block />
        </div>
      </BasicCard>

      <BasicCard :title="$t('leads.reports.pilots')" data-testid="report-pilots">
        <p v-if="pilotError" class="t-negative m-0" role="alert" data-testid="pilot-report-error">{{ pilotError }}</p>
        <div v-else-if="pilots" class="flex-column gap-5">
          <p class="t-muted m-0">{{ $t("leads.reports.as_of", { date: pilots.as_of }) }}</p>
          <dl class="tiles m-0">
            <div v-for="tile in pilotTiles" :key="tile.key" class="tile" :data-testid="`pilot-${tile.key}`">
              <dt class="t-muted fs-200">{{ tile.label }}</dt>
              <dd class="fs-500 fw-600 m-0">{{ tile.value }}</dd>
            </div>
          </dl>
          <h3 class="fs-400 fw-600 m-0">{{ $t("leads.reports.pilots_by_result") }}</h3>
          <ul class="results m-0" data-testid="pilot-by-result">
            <li v-for="(count, result) in pilots.by_result" :key="result">
              <StatusBadge :tone="RESULT_TONES[result] || 'neutral'" :label="`${$t(`leads.pilot.results.${result}`)}: ${count}`" />
            </li>
          </ul>
          <h3 class="fs-400 fw-600 m-0">{{ $t("leads.reports.pilots_switch") }}</h3>
          <p v-if="!pilots.license_switch_due.length" class="t-muted m-0" data-testid="pilot-switch-none">{{ $t("leads.reports.pilots_switch_none") }}</p>
          <ul v-else class="m-0" data-testid="pilot-switch">
            <li v-for="item in pilots.license_switch_due" :key="item.pilot_id">
              <router-link class="t-accent" :to="{ name: 'LeadsThread', params: { id: item.company_id }, query: { tab: 'pilot' } }">{{ item.domain }}</router-link>
              · {{ item.switch_date }}
            </li>
          </ul>
        </div>
        <Loader v-else block />
      </BasicCard>
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import { GET_FunnelReport, GET_PilotReport, GET_Stages } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { formatSeconds } from "@/utils/leadsScoring";

// Leads → Reports (T3): the funnel (transitions between stages, time in a stage, by company `origin`) and the pilot
// report. Both are read-only. The funnel window is UTC days; "any origin" omits the filter, "no origin" sends it empty.
const ANY = "__any__";
const NONE = "__none__";
const RESULT_TONES = { pending: "info", success: "positive", failure: "negative", cancelled: "neutral" };

const origin = ref(ANY);
const dateFrom = ref("");
const dateTo = ref("");
const funnel = ref(null);
const origins = ref([]);
const stages = ref([]);
const funnelError = ref("");
const pilots = ref(null);
const pilotError = ref("");

const stageLabel = (key) => stages.value.find((stage) => stage.key === key)?.label || key;
const dash = (value) => formatSeconds(value) || "—";

const originOptions = computed(() => [
  { value: ANY, label: t("leads.reports.origin_all") },
  ...origins.value.map((item) => ({
    value: item.origin === "" ? NONE : item.origin,
    label: item.origin === "" ? t("leads.reports.origin_none") + ` (${item.companies})` : t("leads.reports.origin_count", { origin: item.origin, count: item.companies }),
  })),
]);

const stageColumns = computed(() => [
  { key: "label", label: t("leads.reports.stage"), width: "1fr" },
  { key: "current", label: t("leads.reports.now"), width: "max-content", align: "right" },
  { key: "entered", label: t("leads.reports.entered"), width: "max-content", align: "right" },
  { key: "left", label: t("leads.reports.left"), width: "max-content", align: "right" },
  { key: "avg", label: t("leads.reports.avg_in_stage"), width: "max-content", align: "right" },
]);
const stageRows = computed(() =>
  (funnel.value?.stages || []).map((row) => ({ ...row, label: stageLabel(row.stage), avg: dash(row.avg_seconds_in_stage) }))
);
const transitionColumns = computed(() => [
  { key: "path", label: t("leads.reports.from_to"), width: "1fr" },
  { key: "count", label: t("leads.reports.count"), width: "max-content", align: "right" },
  { key: "avg", label: t("leads.reports.avg_before"), width: "max-content", align: "right" },
]);
const transitionRows = computed(() =>
  (funnel.value?.transitions || []).map((row) => ({
    key: `${row.from_stage}>${row.to_stage}`,
    path: `${stageLabel(row.from_stage)} → ${stageLabel(row.to_stage)}`,
    count: row.count,
    avg: dash(row.avg_seconds_in_from_stage),
  }))
);

const pilotTiles = computed(() => [
  { key: "total", label: t("leads.reports.pilots_total"), value: pilots.value.total },
  { key: "running", label: t("leads.reports.pilots_running"), value: pilots.value.running },
  { key: "overdue", label: t("leads.reports.pilots_overdue"), value: pilots.value.overdue },
  {
    key: "avg",
    label: t("leads.reports.pilots_avg"),
    value: pilots.value.avg_length_days == null ? "—" : t("leads.reports.pilots_days", { days: Math.round(pilots.value.avg_length_days * 10) / 10 }),
  },
]);

function params() {
  const query = {};
  if (origin.value !== ANY) query.origin = origin.value === NONE ? "" : origin.value;
  if (dateFrom.value) query.date_from = `${dateFrom.value}T00:00:00+00:00`;
  if (dateTo.value) query.date_to = `${dateTo.value}T23:59:59+00:00`;
  return query;
}

// Every load numbers itself: an answer of an earlier filter never overwrites the one the user is looking at.
let loads = 0;
async function loadFunnel() {
  const mine = ++loads;
  funnelError.value = "";
  try {
    const { data } = await GET_FunnelReport(params());
    if (mine !== loads) return;
    funnel.value = data;
    if (origin.value === ANY && !dateFrom.value && !dateTo.value) origins.value = data.origins || [];
  } catch (err) {
    if (mine === loads) funnelError.value = extractApiMessage(err, t("leads.reports.load_error"));
  }
}

async function loadPilots() {
  try {
    pilots.value = (await GET_PilotReport()).data;
  } catch (err) {
    pilotError.value = extractApiMessage(err, t("leads.reports.load_error"));
  }
}

onMounted(async () => {
  try {
    stages.value = (await GET_Stages()).data.results || [];
  } catch {
    stages.value = []; // keys stand in for the labels
  }
  loadFunnel();
  loadPilots();
});
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.reports {
  max-width: 960px;
}
.filters {
  display: grid;
  grid-template-columns: minmax(12rem, 18rem) 10rem 10rem;
  gap: var(--space-4);
  align-items: end;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}
.tile {
  padding: var(--space-5);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}
.results {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: 0;
  list-style: none;
}
@include max-shell {
  .tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@include max-tablet {
  .filters {
    grid-template-columns: 1fr 1fr;
  }
  .filters > :first-child {
    grid-column: 1 / -1;
  }
}
</style>
