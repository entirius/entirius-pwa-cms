<template>
  <BasicModal
    :open="Boolean(contact)"
    :title="$t('leads.contact.why_title', { name: nameOf(contact) })"
    size="sm"
    data-testid="sendcheck"
    @update:open="$emit('close')"
  >
    <Loader v-if="loading" />
    <p v-else-if="error" class="t-negative m-0" role="alert" data-testid="sendcheck-error">{{ error }}</p>
    <div v-else-if="report" class="flex-column gap-4">
      <StatusBadge
        :tone="report.eligible ? 'positive' : 'negative'"
        :label="$t(report.eligible ? 'leads.contact.can_mail' : 'leads.contact.blocked')"
        data-testid="contact-mail-state"
      />
      <ul v-if="report.reasons.length" class="sendcheck__reasons m-0" data-testid="sendcheck-reasons">
        <li v-for="code in report.reasons" :key="code" :data-reason="code">{{ blockReasonLabel(code) }}</li>
      </ul>
    </div>
    <template #footer>
      <ActionBar :labelled="false">
        <BasicButton data-testid="sendcheck-close" @click="$emit('close')">{{ $t("common.close") }}</BasicButton>
      </ActionBar>
    </template>
  </BasicModal>
</template>

<script setup>
import { ref, watch } from "vue";
import { t } from "@/i18n";
import { GET_Mailable } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { blockReasonLabel } from "@/utils/leadsLabels";

// "Why no mail?": the outreach gate's answer for one contact — can be mailed, or blocked with every reason. Read
// only; every open asks again (the answer is the truth now).
const props = defineProps({
  companyId: { type: [Number, String], required: true },
  contact: { type: Object, default: null }, // set = open
});
defineEmits(["close"]);

const report = ref(null);
const loading = ref(false);
const error = ref("");
const nameOf = (contact) => [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || contact?.email || "";

watch(
  () => props.contact?.id,
  async (id) => {
    report.value = null;
    error.value = "";
    if (!id) return;
    loading.value = true;
    try {
      report.value = (await GET_Mailable(props.companyId, id)).data;
    } catch (err) {
      error.value = extractApiMessage(err, t("leads.contact.why_failed"));
    } finally {
      loading.value = false;
    }
  }
);
</script>

<style scoped>
.sendcheck__reasons {
  padding-left: var(--space-5);
}
</style>
