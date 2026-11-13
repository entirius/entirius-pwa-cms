<template>
  <BasicModal
    :open="Boolean(mailbox)"
    :title="title"
    size="sm"
    :actions="actions"
    :persistent="busy"
    data-testid="mailbox-reason-modal"
    @update:open="$emit('close')"
  >
    <FormField :label="$t('leads.mailboxes.reason')" required :error="error">
      <BasicInput v-model="reason" :maxlength="255" data-testid="mailbox-reason" />
    </FormField>
  </BasicModal>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { t } from "@/i18n";
import { POST_MailboxPause, POST_MailboxResume } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";

// Pause or resume one mailbox: both need a reason (it goes to the pause log). `mailbox` set = open; the dialog
// pauses an unpaused mailbox and resumes a paused one, emits `done` after the call and `close` to be hidden.
const props = defineProps({ mailbox: { type: Object, default: null } });
const emit = defineEmits(["close", "done"]);

const reason = ref("");
const error = ref("");
const busy = ref(false);
const resuming = computed(() => Boolean(props.mailbox?.paused_at));
const title = computed(() =>
  t(resuming.value ? "leads.mailboxes.resume_title" : "leads.mailboxes.pause_title", { address: props.mailbox?.address })
);
const actions = computed(() => [
  { key: "cancel", role: "secondary", label: t("common.cancel"), onClick: () => emit("close") },
  {
    key: "submit",
    role: "primary",
    label: t(resuming.value ? "leads.mailboxes.resume" : "leads.mailboxes.pause"),
    loading: busy.value,
    testid: "mailbox-reason-submit",
    onClick: submit,
  },
]);

watch(
  () => props.mailbox,
  () => {
    reason.value = "";
    error.value = "";
  }
);

async function submit() {
  if (!reason.value.trim()) {
    error.value = t("common.required");
    return;
  }
  const call = resuming.value ? POST_MailboxResume : POST_MailboxPause;
  busy.value = true;
  try {
    await call(props.mailbox.id, reason.value.trim());
    emit("done");
    emit("close");
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.mailbox.save_error"));
  } finally {
    busy.value = false;
  }
}
</script>
