<template>
  <article class="card" :class="`card--${deal.stage.kind}`" :data-deal="deal.id" data-testid="deal-card">
    <!-- the title link stretches over the card (a click anywhere opens it); draggable=false leaves the drag to the card -->
    <router-link :to="{ name: 'LeadsDeal', params: { id: deal.id } }" class="card__name" :title="deal.title" draggable="false">
      {{ deal.title }}
    </router-link>
    <p class="card__line card__company">{{ deal.company.name || deal.company.domain }}</p>
    <p v-if="value" class="card__value">{{ value }}</p>
    <p class="card__meta">
      <span>{{ owner }}</span>
      <span v-if="deal.expected_close_date">{{ formatDay(deal.expected_close_date) }}</span>
    </p>
    <StageMenu class="card__control" :stages="stages" :current="deal.stage.key" testid="deal-card" @move="$emit('move', deal, $event)" />
  </article>
</template>

<script setup>
import { computed } from "vue";
import { t } from "@/i18n";
import { formatDay } from "@/utils/format";
import { dealValue } from "./deals";
import StageMenu from "./StageMenu.vue";

// Deal board card (one shape with CompanyCard.vue, board.scss): title link over the card, company, value (the outcome's
// colour in a won or lost stage), owner and expected close; "Change stage" (the other stages) is the keyboard
// alternative to dragging.
const props = defineProps({
  deal: { type: Object, required: true },
  stages: { type: Array, default: () => [] },
});
defineEmits(["move"]);
const value = computed(() => dealValue(props.deal));
const owner = computed(() => (props.deal.owner ? props.deal.owner.name || props.deal.owner.username : t("leads.companies.unassigned")));
</script>

<style lang="scss" scoped>
@import "./board";

.card__company {
  color: var(--text-secondary);
  font-weight: 500;
}

// The number a head of sales looks for: body size, bold, in the outcome's colour once the deal is won or lost.
.card__value {
  margin: 0;
  color: var(--text-strong);
  font-size: var(--fs-300);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.card--won .card__value {
  color: var(--positive);
}

.card--lost .card__value {
  color: var(--negative);
}
</style>
