<template>
  <PageLayout data-testid="leads-deals">
    <template #header>
      <PageHeader :title="$t('leads.deals.title')">
        <template v-if="isDesktop" #meta>
          <ReadonlyOff>
            <SegmentedControl :options="viewOptions" model-value="list" data-testid="deals-view" @update:model-value="openBoard" />
          </ReadonlyOff>
        </template>
        <template #actions>
          <ActionBar :actions="pageActions" />
        </template>
      </PageHeader>
    </template>
    <template #toolbar>
      <DealFilters :query="query" :stages="stages" @set="setFilter" />
    </template>

    <p v-if="boardOnPhone" class="t-muted m-0" data-testid="deals-board-desktop-only">{{ $t("leads.deals.board_desktop_only") }}</p>
    <Loader v-if="loading && !deals.length" block />
    <EmptyState v-else-if="stagesLoaded && !stages.length" icon="empty" size="md" :title="$t('leads.deals.no_stages')" data-testid="deals-no-stages">
      <router-link v-if="canSetUp" class="t-accent" :to="{ name: 'LeadsDealStages' }">{{ $t("leads.deal_stages.title") }}</router-link>
    </EmptyState>
    <!-- Mine is empty while the channel has deals: say so and offer them all (N18) -->
    <EmptyState v-else-if="!deals.length && !filtered && othersExist" icon="empty" size="md" :title="$t('leads.deals.none_mine')" data-testid="deals-empty-mine">
      <BasicButton data-testid="deals-show-all" @click="setFilter({ owner: 'all' })">{{ $t("leads.deals.show_all_deals") }}</BasicButton>
    </EmptyState>
    <!-- the next step ("open one from a company card") only for a role that may open one -->
    <EmptyState v-else-if="!deals.length && !filtered" icon="empty" size="md" :title="$t('leads.deals.empty_title')" :message="readonly ? '' : $t('leads.deals.empty_message')" data-testid="deals-empty">
      <ActionBar :actions="pageActions.map((action) => ({ ...action, role: 'secondary' }))" />
    </EmptyState>
    <EmptyState v-else-if="!deals.length" icon="empty" size="md" :title="$t('leads.deals.none_match')" data-testid="deals-empty">
      <BasicButton data-testid="deals-clear-filters" @click="clearFilters">{{ $t("leads.deals.clear_filters") }}</BasicButton>
    </EmptyState>
    <div v-else class="flex-column gap-4">
      <p v-if="stagesLoaded && !closable" class="t-warning m-0" data-testid="deals-cannot-close">{{ $t("leads.deals.cannot_close") }}</p>
      <DataTable :columns="columns" :rows="rows" row-key="id" :row-attrs="rowAttrs" sortable data-testid="deals-table" @sort="sortBy" @row-click="openDeal">
        <template #cell-title="{ row }">
          <span class="flex-column gap-1">
            <router-link class="fw-600 t-accent" :to="{ name: 'LeadsDeal', params: { id: row.id } }" :title="row.title" @click.stop>{{ row.title }}</router-link>
            <span class="t-muted fs-200">{{ row.summary }}</span>
          </span>
        </template>
        <template #cell-stage="{ row }">
          <StatusBadge v-if="closedFilter" :tone="dealKindTone(row.stage.kind)" :label="row.stage.label" />
          <BasicSelect
            v-else
            :model-value="row.stage.key"
            :options="options"
            :aria-label="$t('leads.deals.stage')"
            :disabled="readonly"
            data-testid="deal-row-stage"
            @click.stop
            @update:model-value="move(row, $event)"
          />
        </template>
        <template #cell-tasks="{ row }">
          <CountBadge :count="row.open_tasks" />
        </template>
      </DataTable>
    </div>
    <LostReasonDialog :move="lost" :stages="stages" @submit="submitLost" @cancel="cancelLost" />
    <DealDialog v-model:open="dialogOpen" />
    <template #footer>
      <Pagination :page="page" :pages="pages" :disabled="loading" @update:page="setFilter({ page: String($event) })" />
    </template>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_DealStages, GET_Deals } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useIsDesktop } from "@/composables/useIsDesktop";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { ReadonlyOff, usePageReadonly } from "@/composables/useReadonly";
import { AREAS } from "@/configs/areas";
import { useAccessStore } from "@/stores/access";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";
import { MAX_TABLET_QUERY } from "@/utils/breakpoints";
import { formatDay } from "@/utils/format";
import DealDialog from "./DealDialog.vue";
import DealFilters from "./DealFilters.vue";
import LostReasonDialog from "./LostReasonDialog.vue";
import { canClose, dealKindTone, dealValue, oneOffText, recurringValueText, stageOptions } from "./deals";
import { useDealMove } from "./useDealMove";

// Deals (ux/screens/deals.md): the list on every width — on a phone it is the screen (no drag and drop below
// 1024 px); filters, sort and page in the URL. The row's stage select moves a deal; a lost stage asks the reason.
const PAGE_SIZE = 20;
const SORTS = { close: "expected_close_date", one_off: "value_one_off", recurring: "value_recurring" };
const DEFAULT_SORT = "expected_close_date";
const FILTER_KEYS = ["stage", "close_from", "close_to", "search"];

const route = useRoute();
const router = useRouter();
const notify = useNotifyStore();
const access = useAccessStore();
const munin = useMuninStore();
const isDesktop = useIsDesktop();
const readonly = usePageReadonly();
const deals = ref([]);
const count = ref(0);
const loading = ref(true);
const stages = ref([]);
const stagesLoaded = ref(false);
const dialogOpen = ref(false);
const { lost, move, submitLost, cancelLost } = useDealMove(stages, { moved: load });

const query = computed(() => ({ owner: "me", kind: "open", ...route.query }));
const page = computed(() => Number(query.value.page) || 1);
const pages = computed(() => Math.max(1, Math.ceil(count.value / PAGE_SIZE)));
// The defaults (Mine, Open) are no filter: a channel without a deal of mine shows the first-run empty state.
const filtered = computed(() => Object.keys(route.query).some((key) => FILTER_KEYS.includes(key)) || query.value.owner !== "me" || query.value.kind !== "open");
const closedFilter = computed(() => ["won", "lost"].includes(query.value.kind));
// The board is a desk screen: a link that asks for it on a phone lands on the list and says so.
const boardOnPhone = computed(() => !isDesktop.value && route.query.view === "board");
const closable = computed(() => canClose(stages.value));
const options = computed(() => stageOptions(stages.value));
const canSetUp = computed(() => access.can(AREAS.LEADS_SETTINGS));
const tasksOn = computed(() => munin.isModuleInstalled("todo"));
const viewOptions = [
  { value: "list", label: t("leads.companies.view_list") },
  { value: "board", label: t("leads.companies.view_board") },
];
const pageActions = computed(() =>
  readonly.value ? [] : [{ key: "open", label: t("leads.deals.open_deal"), role: "primary", mutates: true, testid: "deals-open", onClick: () => (dialogOpen.value = true) }]
);
const columns = computed(() =>
  [
    { key: "title", label: t("leads.deals.col_deal"), width: "1fr", truncate: false },
    { key: "stage", label: t("leads.deals.col_stage"), width: "max-content" },
    { key: "one_off", label: t("leads.deals.col_one_off"), numeric: true, priority: 2, sortable: true },
    { key: "recurring", label: t("leads.deals.col_recurring"), numeric: true, priority: 3, sortable: true },
    { key: "close", label: t("leads.deals.expected_close"), priority: 2, sortable: true },
    { key: "owner", label: t("leads.deals.col_owner"), width: "max-content", priority: 3 },
    tasksOn.value && { key: "tasks", label: t("leads.deals.col_tasks"), priority: 3 },
  ].filter(Boolean)
);
const rows = computed(() => deals.value.map(toRow));
const rowAttrs = (row) => ({ "data-testid": "deal-row", "data-deal": row.id });

const closeText = (deal) => deal.expected_close_date && t("leads.deals.close_on", { date: formatDay(deal.expected_close_date) });

// A phone has no value column: the value rides on the row's second line, as the design draws it (N20).
const isPhone = useMediaQuery(MAX_TABLET_QUERY);

function toRow(deal) {
  return {
    ...deal,
    summary: [deal.company.name || deal.company.domain, isPhone.value && dealValue(deal), closeText(deal)].filter(Boolean).join(" · "),
    one_off: oneOffText(deal) || "—",
    recurring: recurringValueText(deal) || "—",
    close: deal.expected_close_date ? formatDay(deal.expected_close_date) : "—",
    owner: deal.owner ? deal.owner.name || deal.owner.username : t("leads.companies.unassigned"),
  };
}

// The URL is the state: every change replaces the query (page back to 1 unless the page itself changed).
function setFilter(changes) {
  const next = { ...route.query, ...Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, value || undefined])) };
  if (!("page" in changes)) delete next.page;
  router.replace({ query: next });
}

const clearFilters = () => router.replace({ query: { owner: "all", kind: "all" } });
const openBoard = (value) => value === "board" && router.push({ name: "LeadsDealsBoard", query: { owner: query.value.owner } });
const openDeal = (row) => router.push({ name: "LeadsDeal", params: { id: row.id } });

function sortBy({ key, direction }) {
  const field = SORTS[key];
  setFilter({ sort: field && direction ? `${direction === "desc" ? "-" : ""}${field}` : undefined });
}

function params() {
  const { owner, kind, ...rest } = query.value;
  const scope = { ...(owner === "all" ? {} : { owner }), ...(kind === "all" ? {} : { kind }) };
  return { ...rest, ...scope, sort: rest.sort || DEFAULT_SORT, page: page.value, page_size: PAGE_SIZE };
}

// Every load numbers itself: the answer of an older query (a slower, earlier filter) is dropped.
let latest = 0;

async function load() {
  const run = ++latest;
  loading.value = true;
  try {
    const { data } = await GET_Deals(params());
    const others = !data.results.length && !filtered.value && (await anyOpenDeal().catch(() => false));
    if (run !== latest) return;
    deals.value = data.results;
    count.value = data.count ?? data.results.length;
    othersExist.value = others;
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
  } finally {
    if (run === latest) loading.value = false;
  }
}

// Whether any open deal of anybody exists — asked only when Mine came back empty.
const othersExist = ref(false);
async function anyOpenDeal() {
  const { data } = await GET_Deals({ kind: "open", page_size: 1 });
  return Boolean(data.count ?? data.results.length);
}

// A failed stages call leaves the set-up state off (it would replace the deals): the selects stay empty.
async function loadStages() {
  stages.value = (await GET_DealStages()).data.results;
  stagesLoaded.value = true;
}

watch(() => route.query, () => route.name === "LeadsDeals" && load());
onMounted(() => {
  load();
  loadStages().catch(() => {});
});
</script>
