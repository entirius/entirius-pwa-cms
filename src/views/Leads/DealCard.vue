<template>
  <article class="card" :data-deal="deal.id" data-testid="deal-card">
    <!-- the title link stretches over the card (a click anywhere opens it); draggable=false leaves the drag to the card -->
    <router-link :to="{ name: 'LeadsDeal', params: { id: deal.id } }" class="card__name" draggable="false">
      {{ deal.title }}
    </router-link>
    <p class="card__line t-muted">{{ deal.company.name || deal.company.domain }}</p>
    <p v-if="value" class="card__line">{{ value }}</p>
    <p class="card__line t-muted">{{ meta }}</p>
    <!-- the keyboard way to move: a menu of the other stages (a select in a narrow column cut the stage name, N16) -->
    <BasicMenu v-if="!readonly" class="card__stage" :items="items" :label="$t('leads.deals.move_to')" placement="bottom-start" @select="$emit('move', deal, $event.key)">
      <template #trigger>
        <BasicButton size="sm" variant="ghost" data-testid="deal-card-stage">{{ $t("leads.deals.move_to") }}</BasicButton>
      </template>
    </BasicMenu>
  </article>
</template>

<script setup>
import { computed } from "vue";
import { t } from "@/i18n";
import { useReadonly } from "@/composables/useReadonly";
import { formatDay } from "@/utils/format";
import { dealValue, stageOptions } from "./deals";

// Deal board card (modelled on CompanyCard.vue): title link over the card, company, value, owner and expected
// close; "Move to…" (the other stages) is the keyboard alternative to dragging.
const props = defineProps({
  deal: { type: Object, required: true },
  stages: { type: Array, default: () => [] },
});
defineEmits(["move"]);
const readonly = useReadonly();
const items = computed(() =>
  stageOptions(props.stages)
    .filter((option) => option.value !== props.deal.stage.key)
    .map((option) => ({ key: option.value, label: option.label, testid: `deal-card-move-${option.value}` }))
);
const value = computed(() => dealValue(props.deal));
const meta = computed(() => {
  const owner = props.deal.owner ? props.deal.owner.name || props.deal.owner.username : t("leads.companies.unassigned");
  return [owner, props.deal.expected_close_date && formatDay(props.deal.expected_close_date)].filter(Boolean).join(" · ");
});
</script>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  background: var(--surface-base);
}
.card:hover {
  border-color: var(--accent);
}
.card__name {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  font-weight: 600;
  overflow-wrap: break-word;
}
.card__name::after {
  content: "";
  position: absolute;
  inset: 0;
}
/* Above the stretched link: the menu is the card's own control. */
.card__stage {
  position: relative;
  z-index: 1;
  align-self: flex-start;
}
.card__line {
  margin: 0;
  font-size: var(--fs-200);
  overflow-wrap: anywhere;
}
</style>
