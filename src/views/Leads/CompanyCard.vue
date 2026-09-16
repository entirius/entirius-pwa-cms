<template>
  <article class="card" :data-company="company.domain" data-testid="board-card">
    <router-link :to="{ name: 'LeadsThread', params: { id: company.id } }" class="card__name" data-testid="board-card-name">
      {{ company.name || company.domain }}
    </router-link>
    <p class="card__domain ld-muted">{{ company.domain }}</p>
    <p class="ld-muted">{{ companyTypeLabel(company.company_type) }} · {{ lastActivity }}</p>
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
import { companyTypeLabel } from "@/utils/leadsLabels";
import { formatTime } from "@/utils/leadsTime";

// Board card: the company name links to its card, the domain sits below it; type and last activity read as words
// and Leads times. The select is the keyboard alternative to drag.
const props = defineProps({
  company: { type: Object, required: true },
  stages: { type: Array, default: () => [] },
});
defineEmits(["move"]);
const lastActivity = computed(() => formatTime(props.company.last_activity_at) || "\u2014");
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
.card__name {
  font-weight: 600;
  overflow-wrap: break-word;
}
.card__domain {
  margin: 0;
  font-size: var(--fs-100);
  overflow-wrap: anywhere;
}
.card__stage {
  min-height: 28px;
}
</style>
