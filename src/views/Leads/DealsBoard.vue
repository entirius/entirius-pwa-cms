<template>
  <PageLayout data-testid="leads-deals-board">
    <template #header>
      <PageHeader :title="$t('leads.deals.board_title')" :back="{ name: 'LeadsDeals' }">
        <template #meta>
          <ReadonlyOff>
            <SegmentedControl :options="viewOptions" model-value="board" data-testid="deals-view" @update:model-value="openList" />
          </ReadonlyOff>
        </template>
        <template #actions>
          <ActionBar :actions="pageActions" />
        </template>
      </PageHeader>
    </template>
    <template #toolbar>
      <DealFilters :query="query" :full="false" @set="setFilter" />
    </template>
    <Loader v-if="loading && !columns.length" block />
    <EmptyState v-else-if="!columns.length" icon="empty" size="md" :title="$t('leads.deals.no_stages')" data-testid="deals-no-stages">
      <router-link v-if="canSetUp" class="t-accent" :to="{ name: 'LeadsDealStages' }">{{ $t("leads.deal_stages.title") }}</router-link>
    </EmptyState>
    <div v-else class="flex-column gap-4">
      <p v-if="!closable" class="t-warning m-0" data-testid="deals-cannot-close">{{ $t("leads.deals.cannot_close") }}</p>
      <div class="board" data-testid="deals-board-columns">
        <DealBoardColumn v-for="column in columns" :key="column.stage.key" :column="column" :stages="stages" :owner="query.owner" @move="move" />
      </div>
    </div>
    <LostReasonDialog :move="lost" :stages="stages" @submit="submitLost" @cancel="cancelLost" />
    <DealDialog v-model:open="dialogOpen" />
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_DealBoard } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { ReadonlyOff, usePageReadonly } from "@/composables/useReadonly";
import { AREAS } from "@/configs/areas";
import { useAccessStore } from "@/stores/access";
import { useNotifyStore } from "@/stores/notify";
import DealBoardColumn from "./DealBoardColumn.vue";
import DealDialog from "./DealDialog.vue";
import DealFilters from "./DealFilters.vue";
import LostReasonDialog from "./LostReasonDialog.vue";
import { canClose } from "./deals";
import { useDealMove } from "./useDealMove";

// Deals board (desktop only, `meta.desktop`): one column per deal stage from `GET deals/board/`, totals per currency;
// a drop or the card's select moves the deal, a lost column asks the reason first, a refused move snaps back.
const route = useRoute();
const router = useRouter();
const notify = useNotifyStore();
const access = useAccessStore();
const readonly = usePageReadonly();
const columns = ref([]);
const loading = ref(true);
const dialogOpen = ref(false);
const stages = computed(() => columns.value.map((column) => column.stage));
const closable = computed(() => canClose(stages.value));
const canSetUp = computed(() => access.can(AREAS.LEADS_SETTINGS));
const query = computed(() => ({ owner: "me", ...route.query }));
const { lost, move, submitLost, cancelLost } = useDealMove(stages, { moved: load, refused: snapBack });
const viewOptions = [
  { value: "list", label: t("leads.companies.view_list") },
  { value: "board", label: t("leads.companies.view_board") },
];
const pageActions = computed(() =>
  readonly.value ? [] : [{ key: "open", label: t("leads.deals.open_deal"), role: "primary", mutates: true, testid: "deals-open", onClick: () => (dialogOpen.value = true) }]
);

const setFilter = (changes) => router.replace({ query: { ...route.query, ...changes } });
const openList = (value) => value === "list" && router.push({ name: "LeadsDeals", query: { owner: query.value.owner } });
const columnOf = (key) => columns.value.find((column) => column.stage.key === key);

// A dragged card sits in the target column already: back to the column of its stage. A select move moved nothing.
function snapBack(deal, stageKey) {
  const target = columnOf(stageKey)?.deals;
  const index = target ? target.findIndex((row) => row.id === deal.id) : -1;
  if (index < 0) return;
  target.splice(index, 1);
  columnOf(deal.stage.key)?.deals.unshift(deal);
}

async function load() {
  loading.value = true;
  try {
    const owner = query.value.owner === "all" ? undefined : query.value.owner;
    columns.value = (await GET_DealBoard({ owner })).data.results;
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
  } finally {
    loading.value = false;
  }
}

watch(() => route.query, () => route.name === "LeadsDealsBoard" && load());
onMounted(load);
</script>

<style scoped>
/* The stages share the width (up to six fit 1280 px beside the side nav); only a wider pipeline scrolls. */
.board {
  display: grid;
  padding-bottom: var(--space-5);
  grid-auto-flow: column;
  grid-auto-columns: minmax(7rem, 1fr);
  gap: var(--space-4);
  align-items: stretch;
  overflow-x: auto;
}
</style>
