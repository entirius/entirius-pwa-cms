<template>
  <article class="card" :data-company="company.domain" data-testid="board-card">
    <router-link :to="{ name: 'LeadsThread', params: { id: company.id } }" class="card__domain">
      {{ company.domain }}
    </router-link>
    <p class="ld-muted">{{ company.company_type }} · {{ lastActivity }}</p>
    <span v-if="company.do_not_contact" class="ld-badge">{{ $t("leads.company.do_not_contact") }}</span>
    <select
      class="ld-input card__stage"
      :value="company.stage.key"
      :aria-label="$t('leads.board.move_to')"
      data-testid="board-card-stage"
      @change="$emit('move', company, $event.target.value)"
    >
      <option v-for="stage in stages" :key="stage.key" :value="stage.key">{{ stage.label }}</option>
    </select>
  </article>
</template>

<script setup>
import { computed } from "vue";

// Board card: domain link to the company card, type, last activity; the select is the keyboard alternative to drag.
const props = defineProps({
  company: { type: Object, required: true },
  stages: { type: Array, default: () => [] },
});
defineEmits(["move"]);
const lastActivity = computed(() =>
  props.company.last_activity_at ? new Date(props.company.last_activity_at).toLocaleDateString() : "—"
);
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
  padding: var(--space-200);
  border: 1px solid var(--c-basic-300);
  border-radius: 6px;
  background: var(--c-basic-100);
  cursor: grab;
}
.card__domain {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.card__stage {
  min-height: 28px;
}
</style>
