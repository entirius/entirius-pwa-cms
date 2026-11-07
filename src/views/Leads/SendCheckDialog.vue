<template>
  <BasicModal :open="open" :title="$t('leads.sendcheck.title', { email: contact?.email || '' })" size="md" data-testid="sendcheck" @update:open="$emit('close')">
    <Loader v-if="loading" block />
    <p v-else-if="error" class="t-negative m-0" role="alert" data-testid="sendcheck-error">{{ error }}</p>
    <div v-else-if="report" class="sendcheck flex-column gap-4">
      <p class="m-0 flex ai-ct gap-3" data-testid="sendcheck-verdict">
        <StatusBadge :tone="report.eligible ? 'positive' : 'negative'" :label="report.eligible ? $t('leads.sendcheck.ok') : $t('leads.sendcheck.blocked')" />
        <span>{{ report.eligible ? $t("leads.sendcheck.ok_help") : $t("leads.sendcheck.blocked_help") }}</span>
      </p>
      <ul v-if="report.reasons.length" class="sendcheck__reasons m-0" data-testid="sendcheck-reasons">
        <li v-for="code in report.reasons" :key="code" data-testid="sendcheck-reason" :data-reason="code">{{ reasonText(code) }}</li>
      </ul>
      <dl class="sendcheck__facts m-0" data-testid="sendcheck-facts">
        <dt>{{ $t("leads.sendcheck.address") }}</dt>
        <dd>
          <AddressStatus :status="report.email.status" :reason="report.email.reason" />
          <span v-if="report.email.verified_at" class="t-muted fs-200"> · {{ formatDayTime(report.email.verified_at) }}</span>
        </dd>
        <dt>{{ $t("leads.sendcheck.basis") }}</dt>
        <dd>
          {{ report.legal_basis.value ? legalBasisLabel(report.legal_basis.value) : $t("leads.sendcheck.none") }}
          <span v-if="report.legal_basis.source" class="t-muted fs-200"> · {{ report.legal_basis.source }}<template v-if="report.legal_basis.set_at">, {{ formatDayTime(report.legal_basis.set_at) }}</template></span>
          <span v-if="report.legal_basis.consent_ref" class="t-muted fs-200"> · {{ report.legal_basis.consent_ref }}</span>
        </dd>
        <dt>{{ $t("leads.sendcheck.opt_out") }}</dt>
        <dd>{{ report.opt_out_at ? formatDayTime(report.opt_out_at) : $t("leads.sendcheck.no") }}</dd>
        <dt>{{ $t("leads.sendcheck.company_dnc") }}</dt>
        <dd>{{ report.company_do_not_contact ? $t("leads.sendcheck.yes") : $t("leads.sendcheck.no") }}</dd>
        <dt>{{ $t("leads.sendcheck.route") }}</dt>
        <dd>{{ report.sender_route || $t("leads.sendcheck.route_default") }}</dd>
        <dt>{{ $t("leads.sendcheck.retention") }}</dt>
        <dd>
          <template v-if="report.retention.anonymised_at">{{ $t("leads.sendcheck.anonymised", { date: formatDayTime(report.retention.anonymised_at) }) }}</template>
          <template v-else-if="report.retention.exempt_won">{{ $t("leads.sendcheck.retention_won") }}</template>
          <template v-else-if="report.retention.due_at">{{ $t("leads.sendcheck.retention_due", { days: report.retention.days, date: formatDayTime(report.retention.due_at) }) }}</template>
          <template v-else>{{ $t("leads.sendcheck.retention_days", { days: report.retention.days }) }}</template>
        </dd>
      </dl>
    </div>
    <template #footer>
      <ActionBar :labelled="false">
        <BasicButton variant="secondary" data-testid="sendcheck-close" @click="$emit('close')">{{ $t("common.close") }}</BasicButton>
      </ActionBar>
    </template>
  </BasicModal>
</template>

<script setup>
import { ref, watch } from "vue";
import { t } from "@/i18n";
import { GET_SendCheck } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { legalBasisLabel } from "@/utils/leadsLabels";
import { formatDayTime } from "@/utils/leadsTime";
import { blockReasonText } from "@/utils/leadsLabels";
import AddressStatus from "./AddressStatus.vue";

// "Why will this contact not get our mail?" (Q7 send-check): every refusal at once, plus the facts behind them. Read
// only; the fix is elsewhere (the contact, the do-not-contact list), except that an opt-out cannot be lifted.
const props = defineProps({ open: { type: Boolean, default: false }, contact: { type: Object, default: null } });
defineEmits(["close"]);

const report = ref(null);
const loading = ref(false);
const error = ref("");
const reasonText = blockReasonText;

// Every open asks again: the answer is the truth now, not what it was last week.
let loads = 0;
watch(
  () => [props.open, props.contact?.id],
  async ([isOpen, id]) => {
    if (!isOpen || !id) return;
    const mine = ++loads;
    report.value = null;
    error.value = "";
    loading.value = true;
    try {
      const { data } = await GET_SendCheck(id);
      if (mine === loads) report.value = data;
    } catch (err) {
      if (mine === loads) error.value = extractApiMessage(err, t("leads.sendcheck.failed"));
    } finally {
      if (mine === loads) loading.value = false;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.sendcheck__reasons {
  padding-left: var(--space-5);
}
.sendcheck__facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-2) var(--space-5);
}
.sendcheck__facts dt {
  color: var(--text-muted);
}
.sendcheck__facts dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}
@media (max-width: 480px) {
  .sendcheck__facts {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .sendcheck__facts dd {
    margin-bottom: var(--space-3);
  }
}
</style>
