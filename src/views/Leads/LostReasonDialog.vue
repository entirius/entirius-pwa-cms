<template>
  <!-- The lost-reason dialog of ux/screens/deals.md: a lost stage is never entered without a reason -->
  <BasicModal
    :open="Boolean(move)"
    :title="$t('leads.deal.lost_title', { title: move?.deal.title || '' })"
    size="sm"
    :actions="actions"
    data-testid="deal-lost-dialog"
    @update:open="$emit('cancel')"
  >
    <div class="flex-column gap-4">
      <FormField :label="$t('leads.deal.lost_reason')" required :error="error">
        <BasicInput v-model="reason" :maxlength="255" data-testid="deal-lost-reason" />
      </FormField>
      <FormField v-if="lostStages.length > 1" :label="$t('leads.deal.stage')">
        <BasicSelect v-model="stageKey" :options="stageOptions(lostStages)" data-testid="deal-lost-stage" />
      </FormField>
    </div>
  </BasicModal>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { t } from "@/i18n";
import { stageOptions } from "./deals";

// `move` = { deal, stageKey } while open (useDealMove `lost`); Mark lost emits { stageKey, reason }.
const props = defineProps({
  move: { type: Object, default: null },
  stages: { type: Array, default: () => [] },
});
const emit = defineEmits(["submit", "cancel"]);
const reason = ref("");
const stageKey = ref("");
const error = ref("");
const lostStages = computed(() => props.stages.filter((stage) => stage.kind === "lost"));
const actions = computed(() => [
  { key: "cancel", label: t("leads.task.close"), role: "secondary", onClick: () => emit("cancel") },
  { key: "submit", label: t("leads.deal.mark_lost"), role: "primary", mutates: true, testid: "deal-lost-submit", onClick: submit },
]);

watch(
  () => props.move,
  (move) => {
    if (!move) return;
    reason.value = "";
    error.value = "";
    stageKey.value = move.stageKey;
  }
);

function submit() {
  const text = reason.value.trim();
  error.value = text ? "" : t("leads.deal.reason_required");
  if (text) emit("submit", { stageKey: stageKey.value, reason: text });
}
</script>
