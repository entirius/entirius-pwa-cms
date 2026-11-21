<template>
  <PageLayout data-testid="leads-history">
    <template #header>
      <PageHeader :title="$t('leads.journal.title')" />
    </template>
    <template #toolbar>
      <div class="flex ai-fe flex-wrap gap-5">
        <BasicSelect v-model="actor" :floating-label="$t('leads.journal.person')" clearable :options="actorOptions" data-testid="history-actor" />
        <BasicSelect v-model="kind" :floating-label="$t('leads.journal.kind')" clearable :options="kindOptions" data-testid="history-kind" />
        <FormField class="history__period" :label="$t('leads.journal.period')">
          <BasicDatePicker v-model="period" :config="{ mode: 'range', locale: { rangeSeparator: RANGE_SEPARATOR } }" data-testid="history-period" />
        </FormField>
        <FormField class="history__company" :label="$t('leads.journal.company')">
          <EntitySearchPicker
            v-model="company"
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
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_Companies, GET_History, GET_HistoryActors } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { RANGE_SEPARATOR, formatLeadsDateTime } from "@/utils/leadsTime";
import { historyRow, HISTORY_KINDS, kindLabel } from "./history";

// History (U11): every change of the CRM as one journal — when, who, what, on what, why. Filters: person, kind,
// period (days, both included), company; the server pages it. The filters and the page live in the URL, so Back from
// a company card finds the journal as it was left.
const PAGE_SIZE = 50;

const notify = useNotifyStore();
const route = useRoute();
const router = useRouter();

// One router.replace per tick, however many keys the change touches (the picker sets the company and its name).
let queued = null;
function setQuery(patch) {
  if (!queued) {
    queued = { ...route.query };
    queueMicrotask(() => {
      const next = queued;
      queued = null;
      router.replace({ query: next });
    });
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) queued[key] = value;
    else delete queued[key];
  }
}
// A filter changes the query and puts the journal on page one.
const filter = (key, empty = null) =>
  computed({ get: () => route.query[key] || empty, set: (value) => setQuery({ [key]: value, page: undefined }) });
const actor = filter("actor");
const kind = filter("kind");
const period = filter("period", "");
const company = filter("company");
const companyName = computed({ get: () => route.query.company_name || "", set: (value) => setQuery({ company_name: value }) });
const page = computed({
  get: () => Number(route.query.page) || 1,
  set: (value) => setQuery({ page: value > 1 ? String(value) : undefined }),
});
const actors = ref([]);
const rows = ref([]);
const count = ref(0);
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
const filtered = computed(() => Boolean(actor.value || kind.value || period.value || company.value));
const emptyText = computed(() => t(filtered.value ? "leads.journal.none_match" : "leads.journal.empty"));
const pages = computed(() => Math.ceil(count.value / PAGE_SIZE));
const tableRows = computed(() => rows.value.map((activity) => ({ ...historyRow(activity), time: formatLeadsDateTime(activity.created_at) })));

const findCompanies = async (search) =>
  (await GET_Companies({ search, page: 1 })).data.results.map((row) => ({ value: String(row.id), label: row.name || row.domain, secondary: row.domain }));

function params() {
  const [from, to] = (period.value || "").split(RANGE_SEPARATOR);
  return {
    actor: actor.value || undefined,
    kind: kind.value || undefined,
    company: company.value || undefined,
    date_from: from || undefined,
    date_to: to || from || undefined,
    page: page.value,
    page_size: PAGE_SIZE,
  };
}

// Every load numbers itself: the answer of an older query (a slower, earlier filter) is dropped.
let latest = 0;

// A failure keeps the last page on screen (toast only).
async function load() {
  const run = ++latest;
  loading.value = true;
  try {
    const { data } = await GET_History(params());
    if (run !== latest) return;
    rows.value = data.results;
    count.value = data.count;
    error.value = "";
  } catch (err) {
    if (run !== latest) return;
    error.value = extractApiMessage(err, t("leads.common.error"));
    notify.spawnNotification({ msg: error.value, type: "negative" });
  } finally {
    if (run === latest) loading.value = false;
  }
}

async function loadActors() {
  try {
    actors.value = (await GET_HistoryActors()).data.results;
  } catch {
    actors.value = [];
  }
}

// leaving for a company card changes the query too: nothing to load for a screen that is going away
watch([actor, kind, period, company, page], () => route.name === "LeadsHistory" && load());
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
