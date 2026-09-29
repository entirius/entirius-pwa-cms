<template>
  <div class="flex ai-ct jc-fe wrap gap-3" data-testid="company-actions">
    <router-link
      v-if="company.customer_uid && hasAccounts"
      class="company-actions__customer t-accent"
      :to="{ name: 'CustomerDetail', params: { uid: company.customer_uid }, query: { back: $route.fullPath } }"
      data-testid="company-known-customer"
    >
      {{ $t("leads.company.known_customer") }}<template v-if="company.customer_name">: {{ company.customer_name }}</template>
    </router-link>
    <StatusBadge
      v-else-if="company.customer_uid"
      tone="info"
      :label="$t('leads.company.known_customer')"
      data-testid="company-known-customer"
    />
    <ActionBar :actions="actions" />
    <ConfirmDialog
      :open="confirming"
      tone="danger"
      :title="$t('leads.company.mark_dnc')"
      :message="$t('leads.company.dnc_confirm', { domain: company.domain })"
      :confirm-label="$t('leads.company.mark_dnc')"
      :cancel-label="$t('leads.review.cancel')"
      data-testid="company-dnc-confirm"
      @confirm="markDoNotContact"
      @cancel="confirming = false"
    />
    <CommunicateModal v-if="communicating" :company="company" @close="communicating = false" />
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { t } from "@/i18n";
import { PATCH_Company, POST_CreateCustomer, POST_RequestAudit } from "@/api/leads/api";
import { GET_LatestAudit, POST_AuditRerun } from "@/api/siteintel/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";
import CommunicateModal from "./CommunicateModal.vue";

const props = defineProps({ company: { type: Object, required: true } });
const emit = defineEmits(["changed"]);
const munin = useMuninStore();
const notify = useNotifyStore();
const communicating = ref(false);
const confirming = ref(false);

const hasAccounts = computed(() => munin.isModuleInstalled("accounts"));

// R5: secondary · danger · the one primary („Napisz”) rightmost; ActionBar orders them by role.
const actions = computed(() =>
  [
    canCreateCustomer.value && {
      key: "customer",
      label: t("leads.company.create_customer"),
      role: "secondary",
      testid: "company-create-customer",
      onClick: createCustomer,
    },
    { key: "reaudit", label: t("leads.company.reaudit"), role: "secondary", testid: "company-reaudit", onClick: reaudit },
    !props.company.do_not_contact && {
      key: "dnc",
      label: t("leads.company.mark_dnc"),
      role: "danger",
      testid: "company-dnc",
      onClick: () => (confirming.value = true),
    },
    {
      key: "communicate",
      label: t("leads.company.communicate"),
      role: "primary",
      testid: "company-communicate",
      onClick: () => (communicating.value = true),
    },
  ].filter(Boolean)
);
// L-15: the won seam exists only with accounts installed.
const canCreateCustomer = computed(
  () => hasAccounts.value && props.company.stage.kind === "won" && !props.company.customer_uid
);

async function run(call, successKey) {
  try {
    await call();
    notify.spawnNotification({ msg: t(successKey) });
    emit("changed");
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.review.error")), type: "negative" });
  }
}

// S-09: re-running an audit refreshes the reports; a draft needs an intel_ready rule.
function reaudit() {
  return run(async () => {
    const audit = await GET_LatestAudit(props.company.domain);
    await (audit ? POST_AuditRerun(audit.id) : POST_RequestAudit(props.company.id));
  }, "leads.company.reaudit_done");
}

function markDoNotContact() {
  confirming.value = false;
  return run(() => PATCH_Company(props.company.id, { do_not_contact: true }), "leads.company.dnc_done");
}

function createCustomer() {
  return run(() => POST_CreateCustomer(props.company.id), "leads.company.customer_done");
}
</script>

<style scoped>
/* C-43: the customer link reads at body size and keeps a 32 px target. */
.company-actions__customer {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  text-decoration: underline;
}
</style>
