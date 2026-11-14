<template>
  <section class="column" :data-stage="column.stage.key" data-testid="deals-column">
    <header class="flex-column gap-1">
      <span class="flex ai-ct flex-wrap gap-2">
        <strong>{{ column.stage.label }}</strong>
        <CountBadge :count="column.count" data-testid="deals-column-count" />
      </span>
      <span class="flex-column t-muted fs-200" data-testid="deals-column-totals">
        <span v-for="line in totals" :key="line">{{ line }}</span>
      </span>
    </header>
    <!-- the whole body below the header takes a drop, also an empty one; the empty text sits over it, never in the list -->
    <div class="column__body">
      <draggable
        :list="column.deals"
        :disabled="readonly"
        :force-fallback="true"
        fallback-class="drag-ghost"
        ghost-class="deal-slot"
        group="deals"
        item-key="id"
        class="column__cards"
        @change="onChange"
      >
        <template #item="{ element }">
          <DealCard :deal="element" :stages="stages" @move="(deal, key) => $emit('move', deal, key, false)" />
        </template>
      </draggable>
      <p v-if="!column.deals.length" class="column__empty t-muted fs-200 m-0" data-testid="deals-column-empty">{{ $t("leads.deals.column_empty") }}</p>
    </div>
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
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
}
.column__body {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 80px;
}
.column__cards {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-4);
}
/* The card's place in the column under the pointer while dragging: a faint dashed slot, not a second card. */
.column__cards :deep(.deal-slot) {
  border-style: dashed;
  opacity: 0.4;
}
.column__empty {
  position: absolute;
  top: 0;
  pointer-events: none;
}
/* A card hovering over the empty column sits in the list already: the text steps aside. */
.column__cards:has(> *) + .column__empty {
  display: none;
}
</style>
