<template>
  <div class="ld-row" data-testid="company-actions">
    <router-link
      v-if="company.customer_uid && hasAccounts"
      class="ld-link"
      :to="{ name: 'CustomerDetail', params: { uid: company.customer_uid }, query: { back: $route.fullPath } }"
      data-testid="company-known-customer"
    >
      {{ $t("leads.company.known_customer") }}<template v-if="company.customer_name">: {{ company.customer_name }}</template>
    </router-link>
    <span v-else-if="company.customer_uid" class="ld-badge" data-testid="company-known-customer">
      {{ $t("leads.company.known_customer") }}
    </span>
    <button class="ld-btn ld-btn--primary" data-testid="company-communicate" @click="communicating = true">
      {{ $t("leads.company.communicate") }}
    </button>
    <button class="ld-btn" data-testid="company-reaudit" @click="reaudit">{{ $t("leads.company.reaudit") }}</button>
    <button
      v-if="!company.do_not_contact"
      class="ld-btn ld-btn--danger"
      data-testid="company-dnc"
      @click="confirming = true"
    >
      {{ $t("leads.company.mark_dnc") }}
    </button>
    <button v-if="canCreateCustomer" class="ld-btn" data-testid="company-create-customer" @click="createCustomer">
      {{ $t("leads.company.create_customer") }}
    </button>
    <div v-if="confirming" class="confirm" role="dialog" data-testid="company-dnc-confirm">
      <p>{{ $t("leads.company.dnc_confirm", { domain: company.domain }) }}</p>
      <div class="ld-row">
        <button class="ld-btn" @click="confirming = false">{{ $t("leads.review.cancel") }}</button>
        <button class="ld-btn ld-btn--danger" data-testid="company-dnc-yes" @click="markDoNotContact">
          {{ $t("leads.company.mark_dnc") }}
        </button>
      </div>
    </div>
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
.confirm {
  position: fixed;
  top: 30%;
  left: 50%;
  z-index: 20;
  transform: translateX(-50%);
  padding: var(--space-8);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface-base);
  box-shadow: 0 8px 24px rgb(0 0 0 / 20%);
}
</style>
