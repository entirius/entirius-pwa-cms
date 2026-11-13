<template>
  <section class="column" :data-stage="column.stage.key" data-testid="deals-column">
    <header class="flex-column gap-1">
      <span class="flex ai-ct gap-2">
        <strong>{{ column.stage.label }}</strong>
        <CountBadge :count="column.count" data-testid="deals-column-count" />
      </span>
      <span class="flex-column t-muted fs-200" data-testid="deals-column-totals">
        <span v-for="line in totals" :key="line">{{ line }}</span>
      </span>
    </header>
    <draggable
      :list="column.deals"
      :disabled="readonly"
      :force-fallback="true"
      fallback-class="drag-ghost"
      group="deals"
      item-key="id"
      class="column__cards"
      @change="onChange"
    >
      <template #item="{ element }">
        <DealCard :deal="element" :stages="stages" @move="(deal, key) => $emit('move', deal, key, false)" />
      </template>
    </draggable>
    <router-link
      v-if="column.count > column.deals.length"
      class="t-accent fs-200"
      :to="{ name: 'LeadsDeals', query: { stage: column.stage.key, kind: 'all', owner } }"
      data-testid="deals-column-all"
    >
      {{ $t("leads.deals.show_all", { count: column.count }) }}
    </router-link>
  </section>
</template>

<script setup>
import { computed } from "vue";
import draggable from "vuedraggable";
import { useReadonly } from "@/composables/useReadonly";
import DealCard from "./DealCard.vue";
import { totalLines } from "./deals";

// One deal stage of the board (modelled on BoardColumn.vue): label, count, totals per currency, the first 25 deals.
const props = defineProps({
  column: { type: Object, required: true },
  stages: { type: Array, default: () => [] },
  owner: { type: String, default: "me" },
});
const emit = defineEmits(["move"]);
// The board page's read-only mode: a viewer drags no card (the card's stage select follows it on its own).
const readonly = useReadonly();
const totals = computed(() => totalLines(props.column.totals));

// vuedraggable already put the card into this column's list; the board confirms or snaps it back.
function onChange(event) {
  if (event.added) emit("move", event.added.element, props.column.stage.key, true);
}
</script>

<style scoped>
.column {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 240px;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
}
.column__cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-height: 80px;
}
</style>
