<template>
  <ConfirmDialog
    :open="open"
    :title="$t('leads.dnc.confirm_title')"
    :confirm-label="$t('leads.dnc.confirm')"
    :cancel-label="$t('common.cancel')"
    tone="danger"
    :loading="busy"
    confirm-testid="dnc-confirm"
    data-testid="dnc-dialog"
    @confirm="submit"
    @cancel="$emit('close')"
  >
    <div class="flex-column gap-4">
      <p class="m-0" data-testid="dnc-warning">{{ $t("leads.dnc.warning") }}</p>
      <FormField v-if="canChoose" :label="$t('leads.dnc.scope')">
        <BasicRadioGroup v-model="scope" :options="scopeOptions" name="dnc-scope" />
      </FormField>
      <FormField v-else :label="$t('leads.dnc.target')">
        <BasicInput v-model="domainText" data-testid="dnc-domain" />
      </FormField>
      <FormField :label="$t('leads.dnc.reason')" required>
        <BasicInput v-model="reason" :maxlength="200" data-testid="dnc-reason" />
      </FormField>
      <p v-if="error" class="t-negative m-0" role="alert" data-testid="dnc-error">{{ error }}</p>
    </div>
  </ConfirmDialog>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { t } from "@/i18n";
import { POST_DoNotContact } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { domainOf } from "@/utils/leadsOutbound";

// "Do not contact" (Q7): an address or a whole domain goes on the one list that every channel and every communicator
// channel obeys. There is no way back in the API on purpose, so the dialog says so before it asks for the reason.
// Without `contact` the dialog asks for the address or the domain itself (the list page).
const props = defineProps({ open: { type: Boolean, default: false }, contact: { type: Object, default: null } });
const emit = defineEmits(["close", "done"]);

const scope = ref("email");
const reason = ref("");
const domainText = ref("");
const busy = ref(false);
const error = ref("");
const canChoose = computed(() => Boolean(props.contact?.email));
const domain = computed(() => domainOf(props.contact?.email));
const scopeOptions = computed(() => [
  { value: "email", label: t("leads.dnc.scope_email", { email: props.contact?.email || "" }), testid: "dnc-scope-email" },
  { value: "domain", label: t("leads.dnc.scope_domain", { domain: domain.value }), testid: "dnc-scope-domain" },
]);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    scope.value = "email";
    reason.value = "";
    domainText.value = "";
    error.value = "";
  }
);

async function submit() {
  error.value = "";
  if (!reason.value.trim()) return (error.value = t("leads.dnc.reason_required"));
  if (!canChoose.value && !domainText.value.trim()) return (error.value = t("leads.dnc.target_required"));
  const body = { reason: reason.value.trim() };
  if (canChoose.value) body[scope.value] = scope.value === "email" ? props.contact.email : domain.value;
  else body[domainText.value.includes("@") ? "email" : "domain"] = domainText.value.trim().toLowerCase();
  busy.value = true;
  try {
    const { data } = await POST_DoNotContact(body);
    emit("done", { ...data, ...body });
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
  } finally {
    busy.value = false;
  }
}
</script>
