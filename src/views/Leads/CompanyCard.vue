<template>
  <article class="card" :data-company="company.domain" data-testid="board-card" @click="openCard">
    <router-link :to="{ name: 'LeadsThread', params: { id: company.id } }" class="card__name" data-testid="board-card-name">
      {{ company.name || company.domain }}
    </router-link>
    <p class="card__domain ld-muted">{{ company.domain }}</p>
    <p class="ld-muted" data-testid="board-card-activity">{{ leadTypes.label(company.lead_type) }} · {{ lastActivity }}</p>
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
import { useRouter } from "vue-router";
import { t } from "@/i18n";
import { useLeadTypesStore } from "@/stores/leadTypes";
import { formatDayTime } from "@/utils/leadsTime";

// Board card: the whole card opens the company (the name stays the keyboard link); type and last activity read as
// words and one "DD.MM HH:MM" format. The select is the keyboard alternative to drag.
const leadTypes = useLeadTypesStore();
const props = defineProps({
  company: { type: Object, required: true },
  stages: { type: Array, default: () => [] },
});
defineEmits(["move"]);
const router = useRouter();
const lastActivity = computed(() =>
  props.company.last_activity_at
    ? t("leads.board.last_activity", { time: formatDayTime(props.company.last_activity_at) })
    : t("leads.board.no_activity")
);

function openCard(event) {
  if (event.target.closest("a, select")) return;
  router.push({ name: "LeadsThread", params: { id: props.company.id } });
}
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
  cursor: pointer;
}
.card:hover {
  border-color: var(--c-support-400);
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
