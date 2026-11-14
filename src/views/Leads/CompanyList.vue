<template>
  <PageLayout data-testid="leads-companies">
    <template #header>
      <PageHeader :title="$t('leads.companies.title')">
        <template v-if="isDesktop" #meta>
          <SegmentedControl :options="viewOptions" model-value="list" data-testid="companies-view" @update:model-value="openBoard" />
        </template>
        <template #actions>
          <ActionBar :actions="pageActions" />
        </template>
      </PageHeader>
    </template>
    <template #toolbar>
      <div class="flex-column gap-4">
        <BasicInput
          v-model="search"
          type="search"
          icon="search"
          :placeholder="$t('leads.companies.search')"
          data-testid="companies-search"
          @input="debouncedFetch(applySearch)"
        />
        <div class="flex ai-ct flex-wrap gap-5">
          <div v-if="crm" class="filter-chip-row">
            <FilterChip
              v-for="key in OWNERS"
              :key="key"
              :label="$t(`leads.companies.${OWNER_LABELS[key]}`)"
              :active="query.owner === key"
              :data-testid="`companies-owner-${OWNER_TESTIDS[key]}`"
              @click="setFilter('owner', key)"
            />
          </div>
          <MobileFilterPanel :active-count="activeFilters" :trigger-label="$t('leads.companies.filters')" data-testid="companies-filters">
            <BasicSelect :model-value="query.stage || null" :floating-label="$t('leads.companies.stage')" :options="stageOptions" clearable data-testid="companies-filter-stage" @update:model-value="setFilter('stage', $event)" />
            <BasicSelect v-if="crm" :model-value="query.segment || null" :floating-label="$t('leads.companies.segment')" :options="SEGMENTS" clearable data-testid="companies-filter-segment" @update:model-value="setFilter('segment', $event)" />
            <BasicSelect v-if="crm" :model-value="query.origin || null" :floating-label="$t('leads.companies.origin')" :options="originOptions" clearable data-testid="companies-filter-origin" @update:model-value="setFilter('origin', $event)" />
            <BasicSelect :model-value="query.lead_type || null" :floating-label="$t('leads.companies.lead_type')" :options="typeOptions" clearable data-testid="companies-filter-type" @update:model-value="setFilter('lead_type', $event)" />
            <BasicCheckbox :model-value="query.has_reply === 'true'" data-testid="companies-filter-reply" @update:model-value="setFlag('has_reply', $event)">
              {{ $t("leads.companies.with_reply") }}
            </BasicCheckbox>
            <BasicCheckbox :model-value="query.do_not_contact === 'true'" data-testid="companies-filter-dnc" @update:model-value="setFlag('do_not_contact', $event)">
              {{ $t("leads.companies.do_not_contact") }}
            </BasicCheckbox>
            <template v-for="field in listFields" :key="field.key">
              <BasicCheckbox v-if="field.kind === 'bool'" :model-value="query[attrParam(field)] === 'true'" :data-testid="`companies-filter-attr-${field.key}`" @update:model-value="setFlag(attrParam(field), $event)">
                {{ field.label }}
              </BasicCheckbox>
              <BasicSelect v-else-if="field.kind === 'select'" :model-value="query[attrParam(field)] || null" :floating-label="field.label" :options="field.options" clearable :data-testid="`companies-filter-attr-${field.key}`" @update:model-value="setFilter(attrParam(field), $event)" />
              <BasicInput v-else-if="field.kind === 'text'" :model-value="query[attrParam(field)] || ''" :placeholder="field.label" :aria-label="field.label" :data-testid="`companies-filter-attr-${field.key}`" @update:model-value="(value) => debouncedFetch(() => setFilter(attrParam(field), value))" />
            </template>
          </MobileFilterPanel>
        </div>
      </div>
    </template>

    <Loader v-if="loading && !companies.length" block />
    <EmptyState v-else-if="!companies.length && !filtered" icon="empty" size="md" :title="$t('leads.companies.empty_title')" data-testid="companies-empty">
      <ActionBar :actions="pageActions.map((action) => ({ ...action, role: 'secondary' }))" />
    </EmptyState>
    <EmptyState v-else-if="!companies.length" icon="empty" size="md" :title="$t('leads.companies.empty')" data-testid="companies-empty">
      <BasicButton data-testid="companies-clear-filters" @click="clearFilters">{{ $t("leads.companies.clear_filters") }}</BasicButton>
    </EmptyState>
    <div v-else class="flex-column gap-4">
      <DataTable
        ref="table"
        :columns="columns"
        :rows="rows"
        row-key="id"
        :row-attrs="rowAttrs"
        :selectable="bulkOn"
        :multi-select="bulkOn"
        sortable
        data-testid="companies-table"
        @sort="sortBy"
        @select="selected = $event"
        @row-click="openCompany"
      >
        <template #cell-name="{ row }">
          <span class="flex-column gap-1">
            <router-link class="fw-600 t-accent" :to="{ name: 'LeadsThread', params: { id: row.id } }" :title="row.name" @click.stop>
              {{ row.name || row.domain }}
            </router-link>
            <span class="t-muted fs-200">{{ row.domain }}</span>
            <StatusBadge v-if="row.do_not_contact" tone="negative" size="sm" :label="$t('leads.companies.do_not_contact')" />
          </span>
        </template>
        <template #cell-stage="{ row }">
          <StatusBadge :tone="stageTone(row.stage)" :label="row.stage?.label" />
        </template>
        <template #cell-lead_type="{ row }">
          <span :class="{ 't-muted': !knownType(row.lead_type_code) }">{{ row.lead_type }}</span>
        </template>
        <template #cell-owner="{ row }">
          <span :class="{ 't-muted': !row.owner }">{{ ownerName(row.owner) }}</span>
        </template>
        <template #cell-score="{ row }">
          <span v-if="row.score_segment" class="flex ai-ct jc-fe gap-2">
            <StatusBadge :tone="SEGMENT_TONES[row.score_segment]" size="sm" :dot="false" :label="row.score_segment" />{{ row.score_points }}
          </span>
        </template>
      </DataTable>
      <BulkActionBar
        v-if="selected.length"
        :count="selected.length"
        selected-label-key="leads.approvals.selected"
        clear-label-key="leads.approvals.clear"
        :actions="bulkActions"
        data-testid="companies-bulk"
        @action="assign"
        @clear="clearSelection"
      />
    </div>
    <template #footer>
      <Pagination :page="page" :pages="pages" :disabled="loading" @update:page="setFilter('page', String($event))" />
    </template>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { listBoardOptions } from "@/utils/leadsLabels";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_AssignableUsers, GET_Attributes, GET_Companies, GET_Funnel, GET_Stages, POST_AssignOwner } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useIsDesktop } from "@/composables/useIsDesktop";
import { usePageReadonly } from "@/composables/useReadonly";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { UNKNOWN_LEAD_TYPE, useLeadTypesStore } from "@/stores/leadTypes";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";
import { formatRelative } from "@/utils/format";
import { bulkAnswer } from "@/utils/leadsBulk";
import { SEGMENT_TONES, outboundOn, stageTone } from "@/utils/leadsOutbound";
import { fieldsFromDefinitions, formatValue } from "./customFields";

// Companies (ux/screens/companies.md): the full list, every filter, the sort and the page in the URL, served by the
// API page by page. leads >= 0.5.0 adds owner, score, origin, custom-field columns and filters, and bulk assign.
const PAGE_SIZE = 20;
const OWNERS = ["me", "none", "all"];
const OWNER_LABELS = { me: "mine", none: "unassigned", all: "all" };
const OWNER_TESTIDS = { me: "mine", none: "none", all: "all" };
const SEGMENTS = ["S1", "S2", "S3", "S4"].map((value) => ({ value, label: value }));
// DataTable column → the API's sort key (the allowlist; other headers do not sort).
const SORTS = { last_activity: "last_activity_at", score: "score_points", owner: "owner__username" };
const DEFAULT_SORT = "-last_activity_at";

const route = useRoute();
const router = useRouter();
const notify = useNotifyStore();
const leadTypes = useLeadTypesStore();
const isDesktop = useIsDesktop();
const readonly = usePageReadonly();
const crm = computed(() => outboundOn(useMuninStore(), "leads"));
const bulkOn = computed(() => crm.value && !readonly.value);
const { search, debouncedFetch } = useSearchDebounce();
const table = ref(null);
const companies = ref([]);
const count = ref(0);
const loading = ref(true);
const selected = ref([]);
const stages = ref([]);
const origins = ref([]);
const users = ref([]);
const definitions = ref([]);

const query = computed(() => ({ owner: crm.value ? "me" : "all", ...route.query }));
const page = computed(() => Number(query.value.page) || 1);
const pages = computed(() => Math.max(1, Math.ceil(count.value / PAGE_SIZE)));
const FILTER_KEYS = ["stage", "segment", "origin", "lead_type", "has_reply", "do_not_contact", "search"];
const filtered = computed(() => Object.keys(route.query).some((key) => FILTER_KEYS.includes(key) || key.startsWith("attr.")) || query.value.owner !== "all");
const activeFilters = computed(() => Object.keys(route.query).filter((key) => key !== "owner" && key !== "page" && key !== "sort" && key !== "search").length);

const attrParam = (field) => `attr.${field.key}`;
const listFields = computed(() => fieldsFromDefinitions(definitions.value.filter((definition) => definition.show_in_list)));
const stageOptions = computed(() => stages.value.map((stage) => ({ value: stage.key, label: stage.label })));
const typeOptions = computed(() => leadTypes.active.map((type) => ({ value: type.code, label: type.label })));
const originOptions = computed(() => origins.value.filter(Boolean).map((origin) => ({ value: origin, label: origin })));
const viewOptions = computed(listBoardOptions);

const pageActions = computed(() =>
  [
    isDesktop.value && { key: "import", label: t("leads.companies.import"), role: "secondary", testid: "companies-import", onClick: () => router.push({ name: "LeadsImport" }) },
    { key: "add", label: t("leads.companies.add"), role: "primary", testid: "companies-add", onClick: () => router.push({ name: "LeadsCompanyNew" }) },
  ].filter(Boolean)
);
// A column nobody filled on this page is not drawn (a column of dashes names nothing).
const filled = (read) => companies.value.some((company) => ![null, undefined, ""].includes(read(company)));
const columns = computed(() =>
  [
    { key: "name", label: t("leads.companies.col_company"), width: "1fr", truncate: false },
    { key: "stage", label: t("leads.companies.stage"), width: "max-content" },
    crm.value && { key: "owner", label: t("leads.companies.col_owner"), priority: 2, sortable: true },
    crm.value && filled((company) => company.score_segment) && { key: "score", label: t("leads.companies.col_score"), numeric: true, priority: 3, sortable: true },
    { key: "last_activity", label: t("leads.companies.col_last_activity"), priority: 2, sortable: true },
    crm.value && filled((company) => company.origin) && { key: "origin", label: t("leads.companies.origin"), priority: 3 },
    { key: "lead_type", label: t("leads.companies.lead_type"), width: "max-content", truncate: false, priority: 3 },
    ...(crm.value ? listFields.value.filter((field) => filled((company) => company.attributes?.[field.key])).map((field) => ({ key: attrParam(field), label: field.label, priority: 3 })) : []),
  ].filter(Boolean)
);
const rows = computed(() =>
  companies.value.map((company) => ({
    ...company,
    last_activity: formatRelative(company.last_activity_at),
    lead_type_code: company.lead_type,
    // the column names the type already: a company without one reads "Unknown", muted
    lead_type: knownType(company.lead_type) ? leadTypes.label(company.lead_type) : t("leads.companies.type_unknown"),
    ...Object.fromEntries(listFields.value.map((field) => [attrParam(field), formatValue(field, company.attributes?.[field.key])])),
  }))
);
const rowAttrs = (row) => ({ "data-testid": "companies-item", "data-company": row.id });
const bulkActions = computed(() => [
  {
    key: "assign",
    labelKey: "leads.companies.assign",
    testid: "companies-assign",
    options: [{ value: "none", label: t("leads.companies.unassigned") }, ...users.value.map((user) => ({ value: String(user.id), label: ownerName(user) }))],
  },
]);

const knownType = (code) => Boolean(code) && code !== UNKNOWN_LEAD_TYPE;
const ownerName = (owner) => (owner ? owner.name || owner.username : t("leads.companies.unassigned"));

// The URL is the state: every change replaces the query (page back to 1 unless the page itself changed).
function setFilter(key, value) {
  const next = { ...route.query, [key]: value || undefined };
  if (key !== "page") delete next.page;
  router.replace({ query: next });
}

const setFlag = (key, on) => setFilter(key, on ? "true" : undefined);
const applySearch = () => setFilter("search", search.value.trim());
const clearFilters = () => router.replace({ query: crm.value ? { owner: "all" } : {} });
const openBoard = (value) => value === "board" && router.push({ name: "LeadsBoard" });
const openCompany = (row) => router.push({ name: "LeadsThread", params: { id: row.id } });

function sortBy({ key, direction }) {
  const field = SORTS[key];
  setFilter("sort", field && direction ? `${direction === "desc" ? "-" : ""}${field}` : undefined);
}

function params() {
  const { owner, ...rest } = query.value;
  return { ...rest, ...(owner === "all" ? {} : { owner }), sort: rest.sort || DEFAULT_SORT, page: page.value, page_size: PAGE_SIZE };
}

async function load() {
  loading.value = true;
  try {
    const { data } = await GET_Companies(params());
    companies.value = data.results;
    count.value = data.count ?? data.results.length;
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.companies.load_error")), type: "negative" });
  } finally {
    loading.value = false;
  }
}

// Filter options; each one only adds to the page, a failure leaves its filter empty.
async function loadOptions() {
  const extras = crm.value ? [GET_Attributes("company"), GET_Funnel({}), GET_AssignableUsers()] : [];
  const [stageRes, , attrs, funnel, people] = await Promise.allSettled([GET_Stages(), leadTypes.load(), ...extras]);
  if (stageRes.status === "fulfilled") stages.value = stageRes.value.data.results;
  if (attrs?.status === "fulfilled") definitions.value = attrs.value.data.results;
  if (funnel?.status === "fulfilled") origins.value = funnel.value.data.origins.map((row) => row.origin);
  if (people?.status === "fulfilled") users.value = people.value;
}

function clearSelection() {
  table.value?.clearSelection();
  selected.value = [];
}

async function assign(key, value) {
  const owner = value === "none" ? null : Number(value);
  const ids = selected.value.map((row) => row.id);
  try {
    const { data } = await POST_AssignOwner(ids, owner);
    const name = owner ? ownerName(users.value.find((user) => user.id === owner)) : t("leads.companies.unassigned");
    // all or nothing: the API refuses the whole batch (409/400) or changes it; `updated` leaves out the unchanged owners
    notify.spawnNotification(bulkAnswer({ doneKey: "leads.companies.assigned", done: data.updated, params: { name } }));
    clearSelection();
    await load();
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.companies.load_error")), type: "negative" });
  }
}

// Only a query change of this page reloads it (a click to a card changes the route before the list unmounts).
watch(() => route.query, () => route.name === "LeadsCompanies" && load());
onMounted(() => {
  search.value = route.query.search || "";
  load();
  loadOptions();
});
</script>
