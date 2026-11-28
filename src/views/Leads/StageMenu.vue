<template>
  <BasicMenu v-if="!readonly" :items="items" :label="$t('leads.board.move_to')" placement="bottom-start" @select="$emit('move', $event.key)">
    <template #trigger>
      <BasicButton size="sm" :data-testid="`${testid}-stage`">{{ $t("leads.board.move_to") }}</BasicButton>
    </template>
  </BasicMenu>
</template>

<script setup>
import { computed } from "vue";
import { useReadonly } from "@/composables/useReadonly";

// A board card's "Change stage" (deals and companies boards): the keyboard alternative to dragging, a menu of the
// other stages — a select in a narrow column cut the stage name and repeated the column's own (N16). A read-only
// page shows none. `testid` names the card: the trigger is `${testid}-stage`, an item `${testid}-move-<stage key>`.
const props = defineProps({
  stages: { type: Array, default: () => [] }, // [{ key, label }]
  current: { type: String, required: true },
  testid: { type: String, required: true }, // the card's, e.g. `deal-card`
});
defineEmits(["move"]);
const readonly = useReadonly();
const items = computed(() =>
  props.stages
    .filter((stage) => stage.key !== props.current)
    .map((stage) => ({ key: stage.key, label: stage.label, testid: `${props.testid}-move-${stage.key}` }))
);
</script>
