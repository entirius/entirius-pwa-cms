<template>
  <PageLayout data-testid="leads-history">
    <template #header>
      <PageHeader :title="$t('leads.journal.title')" />
    </template>
    <template #toolbar>
      <div class="flex ai-fe flex-wrap gap-5">
        <BasicSelect v-model="filters.actor" :floating-label="$t('leads.journal.person')" clearable :options="actorOptions" data-testid="history-actor" />
        <BasicSelect v-model="filters.kind" :floating-label="$t('leads.journal.kind')" clearable :options="kindOptions" data-testid="history-kind" />
        <FormField class="history__period" :label="$t('leads.journal.period')">
          <BasicDatePicker v-model="filters.period" :config="{ mode: 'range', locale: { rangeSeparator: RANGE_SEPARATOR } }" data-testid="history-period" />
        </FormField>
        <FormField class="history__company" :label="$t('leads.journal.company')">
          <EntitySearchPicker
            v-model="filters.company"
            v-model:display-value="companyName"
            :fetch-fn="findCompanies"
            :placeholder="$t('leads.journal.company_search')"
            data-testid="history-company"
          />
        </FormField>
      </div>
    </template>

    <Loader v-if="loading && !rows.length" block />
    <p v-else-if="error && !rows.length" class="t-negative m-0" role="alert" data-testid="history-error">{{ error }}</p>
    <DataTable
      v-else
      :columns="columns"
      :rows="tableRows"
      row-key="id"
      :row-attrs="() => ({ 'data-testid': 'history-row' })"
      :empty-text="emptyText"
      data-testid="history-table"
    >
      <template #cell-on="{ row }">
        <router-link v-if="row.companyId" :to="{ name: 'LeadsThread', params: { id: row.companyId } }" data-testid="history-company-link">
          {{ row.on }}
        </router-link>
        <span v-else>{{ row.on }}</span>
      </template>
    </DataTable>
    <template #footer>
      <Pagination v-model:page="page" :pages="pages" />
    </template>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { t } from "@/i18n";
import { GET_Companies, GET_History, GET_HistoryActors } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { formatLeadsDateTime } from "@/utils/leadsTime";
import { historyRow, HISTORY_KINDS, kindLabel } from "./history";

// History (U11): every change of the CRM as one journal — when, who, what, on what, why. Filters: person, kind,
// period (days, both included), company; the server pages it.
const PAGE_SIZE = 50;
const RANGE_SEPARATOR = " – "; // fixed, so the Polish locale (" do ") never changes what is parsed

const notify = useNotifyStore();
const filters = reactive({ actor: null, kind: null, period: "", company: null });
const companyName = ref("");
const actors = ref([]);
const rows = ref([]);
const count = ref(0);
const page = ref(1);
const loading = ref(true);
const error = ref("");

const columns = [
  { key: "time", label: t("leads.journal.col_time"), width: "max-content" },
  { key: "who", label: t("leads.journal.col_who"), width: "max-content" },
  { key: "what", label: t("leads.journal.col_what"), width: "1fr" },
  { key: "on", label: t("leads.journal.col_on"), width: "minmax(8rem, 0.6fr)" },
  { key: "reason", label: t("leads.journal.col_reason"), width: "minmax(8rem, 0.6fr)", priority: 2 },
];
const actorOptions = computed(() => actors.value.map((actor) => ({ value: actor, label: historyRow({ actor }).who })));
const kindOptions = HISTORY_KINDS.map((value) => ({ value, label: kindLabel(value) }));
const filtered = computed(() => Boolean(filters.actor || filters.kind || filters.period || filters.company));
const emptyText = computed(() => t(filtered.value ? "leads.journal.none_match" : "leads.journal.empty"));
const pages = computed(() => Math.ceil(count.value / PAGE_SIZE));
const tableRows = computed(() => rows.value.map((activity) => ({ ...historyRow(activity), time: formatLeadsDateTime(activity.created_at) })));

const findCompanies = async (search) =>
  (await GET_Companies({ search, page: 1 })).data.results.map((row) => ({ value: String(row.id), label: row.name || row.domain, secondary: row.domain }));

function params() {
  const [from, to] = (filters.period || "").split(RANGE_SEPARATOR);
  return {
    actor: filters.actor || undefined,
    kind: filters.kind || undefined,
    company: filters.company || undefined,
    date_from: from || undefined,
    date_to: to || from || undefined,
    page: page.value,
    page_size: PAGE_SIZE,
  };
}

// A failure keeps the last page on screen (toast only).
async function load() {
  loading.value = true;
  try {
    const { data } = await GET_History(params());
    rows.value = data.results;
    count.value = data.count;
    error.value = "";
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.common.error"));
    notify.spawnNotification({ msg: error.value, type: "negative" });
  } finally {
    loading.value = false;
  }
}

async function loadActors() {
  try {
    actors.value = (await GET_HistoryActors()).data.results;
  } catch {
    actors.value = [];
  }
}

watch(
  () => [filters.actor, filters.kind, filters.period, filters.company],
  () => {
    if (page.value === 1) load();
    else page.value = 1;
  }
);
watch(page, load);
onMounted(() => {
  load();
  loadActors();
});
</script>

<style scoped>
.history__period,
.history__company {
  width: 18rem;
}
</style>
