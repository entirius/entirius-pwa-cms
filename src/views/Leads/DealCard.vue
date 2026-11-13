<template>
  <article class="card" :data-deal="deal.id" data-testid="deal-card">
    <!-- the title link stretches over the card (a click anywhere opens it); draggable=false leaves the drag to the card -->
    <router-link :to="{ name: 'LeadsDeal', params: { id: deal.id } }" class="card__name" draggable="false">
      {{ deal.title }}
    </router-link>
    <p class="card__line t-muted">{{ deal.company.name || deal.company.domain }}</p>
    <p v-if="value" class="card__line">{{ value }}</p>
    <p class="card__line t-muted">{{ meta }}</p>
    <BasicSelect
      class="card__stage"
      :model-value="deal.stage.key"
      :options="options"
      :floating-label="$t('leads.deals.stage')"
      :disabled="readonly"
      data-testid="deal-card-stage"
      @update:model-value="$emit('move', deal, $event)"
    />
  </article>
</template>

<script setup>
import { computed } from "vue";
import { t } from "@/i18n";
import { useReadonly } from "@/composables/useReadonly";
import { formatDay } from "@/utils/format";
import { dealValue, stageOptions } from "./deals";

// Deal board card (modelled on CompanyCard.vue): title link over the card, company, value, owner and expected
// close; the stage select is the keyboard alternative to dragging.
const props = defineProps({
  deal: { type: Object, required: true },
  stages: { type: Array, default: () => [] },
});
defineEmits(["move"]);
const readonly = useReadonly();
const options = computed(() => stageOptions(props.stages));
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
/* Above the stretched link: the select is the card's own control. */
.card__stage {
  position: relative;
  z-index: 1;
}
.card__line {
  margin: 0;
  font-size: var(--fs-200);
  overflow-wrap: anywhere;
}
</style>
