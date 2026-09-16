<template>
  <section class="column" :data-stage="stage.key" data-testid="board-column">
    <header class="column__head">
      <strong>{{ stage.label }}</strong>
      <span class="ld-badge" data-testid="board-column-count">{{ count }}</span>
      <span v-if="rules.length" class="ld-badge" :title="rulesTooltip" data-testid="board-column-rules">
        {{ $t(`leads.board.rules_${pluralKey(rules.length)}`, { count: rules.length }) }}
      </span>
    </header>
    <draggable
      :list="cards"
      group="board"
      item-key="id"
      class="column__cards"
      @change="onChange"
    >
      <template #item="{ element }">
        <CompanyCard :company="element" :stages="stages" @move="forwardMove" />
      </template>
    </draggable>
    <button v-if="hasMore" class="ld-btn" data-testid="board-column-more" @click="$emit('more')">
      {{ $t("leads.board.more") }}
    </button>
  </section>
</template>

<script setup>
import { computed } from "vue";
import draggable from "vuedraggable";
import { pluralKey } from "@/utils/plural";
import CompanyCard from "./CompanyCard.vue";

const props = defineProps({
  stage: { type: Object, required: true },
  stages: { type: Array, default: () => [] },
  cards: { type: Array, default: () => [] },
  count: { type: Number, default: 0 },
  hasMore: { type: Boolean, default: false },
  rules: { type: Array, default: () => [] },
});
const emit = defineEmits(["move", "more"]);

const rulesTooltip = computed(() =>
  props.rules.map((rule) => `${rule.action} ${rule.template_key} · ${rule.contact_strategy}`).join("\n")
);

// vuedraggable already put the card into this column's list; the board confirms or snaps it back.
function onChange(event) {
  if (event.added) emit("move", event.added.element, props.stage.key, true);
}

function forwardMove(company, stageKey) {
  emit("move", company, stageKey, false);
}
</script>

<style scoped>
.column {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  min-width: 240px;
  padding: var(--space-200);
  border-radius: 8px;
  background: var(--c-basic-200);
}
.column__head {
  display: flex;
  align-items: center;
  gap: var(--space-100);
}
.column__cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  min-height: 80px;
}
</style>
