<template>
  <BasicModal :open="true" :title="$t('leads.rewrite.title')" :actions="actions" data-testid="rewrite-modal" @close="$emit('close')">
    <FormField :label="$t('leads.rewrite.label')" :description="$t('leads.rewrite.hint')">
      <BasicTextarea v-model="notes" :rows="4" :placeholder="$t('leads.rewrite.placeholder')" data-testid="rewrite-notes" />
    </FormField>
  </BasicModal>
</template>

<script setup>
import { computed, ref } from "vue";
import { t } from "@/i18n";

// The reviewer's note for an AI rewrite of the draft; the caller mounts it while open.
const emit = defineEmits(["submit", "close"]);
const notes = ref("");

const actions = computed(() => [
  { key: "cancel", label: t("leads.review.cancel"), role: "secondary", testid: "rewrite-cancel", onClick: () => emit("close") },
  {
    key: "submit",
    label: t("leads.rewrite.submit"),
    role: "primary",
    disabled: !notes.value.trim(),
    testid: "rewrite-submit",
    onClick: () => emit("submit", notes.value.trim()),
  },
]);
</script>
