<template>
  <article class="card" :data-company="company.domain" data-testid="board-card">
    <!-- the name link stretches over the card (a click anywhere opens it); draggable=false leaves the drag to the card -->
    <router-link
      :to="{ name: 'LeadsThread', params: { id: company.id } }"
      class="card__name"
      :title="company.name || company.domain"
      draggable="false"
      data-testid="board-card-name"
    >
      {{ company.name || company.domain }}
    </router-link>
    <p class="card__line card__domain t-muted">{{ company.domain }}</p>
    <p class="card__meta" data-testid="board-card-activity">
      <span>{{ leadTypes.label(company.lead_type) }}</span>
      <span>{{ lastActivity }}</span>
    </p>
    <StatusBadge
      v-if="company.do_not_contact"
      class="card__badge"
      tone="negative"
      size="sm"
      :label="$t('leads.company.do_not_contact')"
    />
    <StageMenu class="card__control" :stages="stages" :current="company.stage.key" testid="board-card" @move="$emit('move', company, $event)" />
  </article>
</template>

<script setup>
import { computed } from "vue";
import { t } from "@/i18n";
import { useLeadTypesStore } from "@/stores/leadTypes";
import { formatDayTime } from "@/utils/leadsTime";
import StageMenu from "./StageMenu.vue";

// Board card (one shape with DealCard.vue, board.scss): the whole card opens the company through its name link; type
// and last activity read as words and one "DD.MM HH:MM" format. "Change stage" (StageMenu) is the keyboard alternative
// to dragging.
const leadTypes = useLeadTypesStore();
const props = defineProps({
  company: { type: Object, required: true },
  stages: { type: Array, default: () => [] },
});
defineEmits(["move"]);
const lastActivity = computed(() =>
  props.company.last_activity_at
    ? t("leads.board.last_activity", { time: formatDayTime(props.company.last_activity_at) })
    : t("leads.board.no_activity")
);
</script>

<style lang="scss" scoped>
@import "./board";

.card__badge {
  align-self: flex-start;
}
</style>
