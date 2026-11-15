<template>
  <!-- The potential dot (U2): its colour, ★ when a salesperson set it, the reason on hover; a click opens the dialog -->
  <component
    :is="editable ? 'button' : 'span'"
    v-if="company.potential || editable"
    :type="editable ? 'button' : undefined"
    class="potential-dot inline-flex ai-ct gap-1"
    :class="`potential-dot--${company.potential || 'none'}`"
    :title="reason"
    :aria-label="`${$t('leads.potential.title')}: ${label} — ${reason}`"
    :data-testid="testid"
    :data-potential="company.potential || 'none'"
    v-on="editable ? { click: onClick } : {}"
  >
    <span class="potential-dot__mark" aria-hidden="true" />
    <span
      v-if="company.potential_manual"
      class="potential-dot__star"
      aria-hidden="true"
      data-testid="potential-star"
      >★</span
    >
    <span
      v-if="withReason"
      class="t-secondary fs-200"
      data-testid="potential-reason"
      >{{ reason }}</span
    >
  </component>
</template>

<script setup>
import { computed } from "vue";
import { potentialLabel, potentialReason } from "./potential";

const props = defineProps({
  company: { type: Object, required: true },
  editable: { type: Boolean, default: false },
  withReason: { type: Boolean, default: false },
  // the legend: the colour's name instead of a reason
  plain: { type: Boolean, default: false },
  testid: { type: String, default: "potential-dot" },
});
const emit = defineEmits(["edit"]);
const reason = computed(() =>
  props.plain
    ? potentialLabel(props.company.potential)
    : potentialReason(props.company)
);
const label = computed(() => potentialLabel(props.company.potential));

function onClick(event) {
  event.stopPropagation();
  emit("edit", props.company);
}
</script>

<style scoped>
.potential-dot {
  border: 0;
  padding: 0;
  background: none;
  color: inherit;
  font: inherit;
}
button.potential-dot {
  cursor: pointer;
}
.potential-dot__mark {
  width: 10px;
  height: 10px;
  flex: none;
  border-radius: 50%;
  border: 1px solid var(--border-subtle);
  background: transparent;
}
.potential-dot--green .potential-dot__mark {
  background: var(--positive);
  border-color: var(--positive);
}
.potential-dot--orange .potential-dot__mark {
  background: var(--warning);
  border-color: var(--warning);
}
.potential-dot--red .potential-dot__mark {
  background: var(--negative);
  border-color: var(--negative);
}
.potential-dot__star {
  font-size: var(--fs-200);
  line-height: 1;
}
</style>
