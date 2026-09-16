<template>
  <div class="ld-page" data-testid="leads-board">
    <div class="ld-row">
      <h2 class="ld-title">{{ $t("leads.board.title") }}</h2>
      <input
        v-model="search"
        class="ld-input"
        type="search"
        :placeholder="$t('leads.board.search')"
        data-testid="board-search"
        @keydown.enter="load"
      />
      <FilterChip
        v-for="type in COMPANY_TYPES"
        :key="type"
        :label="companyTypeLabel(type)"
        :active="filters.company_type === type"
        @click="setFilter('company_type', filters.company_type === type ? '' : type)"
      />
      <FilterChip
        :label="$t('leads.board.has_reply')"
        :active="filters.has_reply"
        data-testid="board-filter-reply"
        @click="setFilter('has_reply', !filters.has_reply)"
      />
      <FilterChip
        :label="$t('leads.company.do_not_contact')"
        :active="filters.do_not_contact"
        data-testid="board-filter-dnc"
        @click="setFilter('do_not_contact', !filters.do_not_contact)"
      />
    </div>
    <div class="board">
      <BoardColumn
        v-for="stage in stages"
        :key="stage.key"
        :stage="stage"
        :stages="stages"
        :cards="columns[stage.key]?.cards || []"
        :count="columns[stage.key]?.count || 0"
        :has-more="Boolean(columns[stage.key]?.next)"
        :rules="rulesByStage[stage.id] || []"
        @move="move"
        @more="loadColumn(stage.key, columns[stage.key].page + 1)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_Companies, GET_Rules, GET_Stages, POST_Transition } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { companyTypeLabel } from "@/utils/leadsLabels";
import { useNotifyStore } from "@/stores/notify";
import BoardColumn from "./BoardColumn.vue";

const COMPANY_TYPES = ["RETAILER", "WHOLESALE", "MANUFACTURER"];
const notify = useNotifyStore();
const stages = ref([]);
const rules = ref([]);
const columns = reactive({});
const search = ref("");
const filters = reactive({ company_type: "", has_reply: false, do_not_contact: false });

// Rules come from `GET rules/` (the stages payload carries none), grouped per stage for the column badge.
const rulesByStage = computed(() =>
  rules.value.filter((rule) => rule.is_active).reduce((acc, rule) => {
    (acc[rule.stage_id] ||= []).push(rule);
    return acc;
  }, {})
);

// Filters are server-side so counts and paging match; a cleared filter is omitted (a blank boolean is a 400).
function activeFilters() {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
}

// Every full reload starts a new run; a column response from an older run (a slower, earlier filter) is dropped.
let latestRun = 0;

async function loadColumn(key, page = 1) {
  const run = latestRun;
  const params = { stage: key, search: search.value, sort: "-last_activity_at", page, ...activeFilters() };
  const { data } = await GET_Companies(params);
  if (run !== latestRun) return;
  const previous = page > 1 ? columns[key].cards : [];
  columns[key] = { cards: [...previous, ...data.results], count: data.count, next: data.next, page };
}

function loadColumns() {
  latestRun += 1;
  return Promise.all(stages.value.map((stage) => loadColumn(stage.key)));
}

function setFilter(name, value) {
  filters[name] = value;
  return loadColumns();
}

async function load() {
  const [stageRes, ruleRes] = await Promise.all([GET_Stages(), GET_Rules()]);
  stages.value = stageRes.data.results;
  rules.value = ruleRes.data.results || [];
  await loadColumns();
}

function relocate(company, fromKey, toKey) {
  const from = columns[fromKey].cards;
  const index = from.findIndex((card) => card.id === company.id);
  if (index >= 0) from.splice(index, 1);
  if (!columns[toKey].cards.some((card) => card.id === company.id)) columns[toKey].cards.unshift(company);
}

// Drag (already moved by vuedraggable) or the card's stage select; a refused move snaps back with the API message.
async function move(company, stageKey, dragged) {
  const fromKey = company.stage.key;
  if (fromKey === stageKey) return;
  if (!dragged) relocate(company, fromKey, stageKey);
  try {
    const { data } = await POST_Transition(company.id, stageKey);
    company.stage = data.stage;
    columns[fromKey].count -= 1;
    columns[stageKey].count += 1;
  } catch (err) {
    relocate(company, stageKey, fromKey);
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.board.move_failed")), type: "negative" });
  }
}

onMounted(load);
</script>

<style scoped>
.board {
  display: flex;
  gap: var(--space-300);
  align-items: flex-start;
  overflow-x: auto;
}
</style>
