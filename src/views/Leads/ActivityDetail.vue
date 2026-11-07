<template>
  <span v-if="intent" class="activity-detail__chip" data-testid="activity-intent">
    <StatusBadge size="sm" :tone="INTENT_TONES[intent] || 'neutral'" :label="intentLabel(intent)" />
  </span>
  <ul v-if="reasons.length" class="activity-detail__reasons m-0" data-testid="activity-reasons" :aria-label="$t('leads.activity.reasons')">
    <li v-for="(reason, i) in reasons" :key="i">{{ reason }}</li>
  </ul>
</template>

<script setup>
import { computed } from "vue";
import { INTENT_TONES } from "@/utils/leadsIntents";
import { intentLabel } from "@/utils/leadsLabels";

// What an activity carries beyond its sentence: the class of a reply (T4) and the reasons of a score (T3). The
// reasons are the service's own words ("retailer: +30", "disqualified: marketplace").
const props = defineProps({ activity: { type: Object, required: true } });
const intent = computed(() => (props.activity.kind === "reply" ? props.activity.data?.intent || "" : ""));
const reasons = computed(() => (props.activity.kind === "score" && Array.isArray(props.activity.data?.reasons) ? props.activity.data.reasons : []));
</script>

<style scoped>
.activity-detail__chip {
  margin-left: var(--space-3);
}
.activity-detail__reasons {
  padding-left: var(--space-8);
  color: var(--text-secondary);
  font-size: var(--fs-200);
}
</style>
