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
        :label="type"
        :active="typeFilter === type"
        @click="typeFilter = typeFilter === type ? '' : type"
      />
      <FilterChip
        :label="$t('leads.company.do_not_contact')"
        :active="dncOnly"
        data-testid="board-filter-dnc"
        @click="dncOnly = !dncOnly"
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
        :visible="matchesFilters"
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
import { useNotifyStore } from "@/stores/notify";
import BoardColumn from "./BoardColumn.vue";

const COMPANY_TYPES = ["RETAILER", "WHOLESALE", "MANUFACTURER"];
const notify = useNotifyStore();
const stages = ref([]);
const rules = ref([]);
const columns = reactive({});
const search = ref("");
const typeFilter = ref("");
const dncOnly = ref(false);

// Rules come from `GET rules/` (the stages payload carries none), grouped per stage for the column badge.
const rulesByStage = computed(() =>
  rules.value.filter((rule) => rule.is_active).reduce((acc, rule) => {
    (acc[rule.stage_id] ||= []).push(rule);
    return acc;
  }, {})
);

function matchesFilters(company) {
  if (typeFilter.value && company.company_type !== typeFilter.value) return false;
  return !dncOnly.value || company.do_not_contact;
}

async function loadColumn(key, page = 1) {
  const params = { stage: key, search: search.value, sort: "-last_activity_at", page };
  const { data } = await GET_Companies(params);
  const previous = page > 1 ? columns[key].cards : [];
  columns[key] = { cards: [...previous, ...data.results], count: data.count, next: data.next, page };
}

async function load() {
  const [stageRes, ruleRes] = await Promise.all([GET_Stages(), GET_Rules()]);
  stages.value = stageRes.data.results;
  rules.value = ruleRes.data.results || [];
  await Promise.all(stages.value.map((stage) => loadColumn(stage.key)));
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
