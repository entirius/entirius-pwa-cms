<template>
  <BasicModal :open="open" :title="$t('leads.compose.title')" size="lg" :persistent="sending" data-testid="compose-dialog" @update:open="askClose">
    <div class="flex-column gap-5">
      <div class="form-grid">
        <FormField :label="$t('leads.compose.to')" required>
          <BasicSelect v-if="recipients.length" v-model="form.contactId" :options="recipients" data-testid="compose-to" />
          <p v-else class="t-muted m-0" data-testid="compose-to">{{ $t("leads.compose.no_contact") }}</p>
          <p v-if="blocked" class="m-0 flex ai-ct flex-wrap gap-2" data-testid="compose-blocked">
            <StatusBadge tone="negative" :label="$t('leads.contact.blocked')" />
            <span>{{ blockReasonLabel(blocked) }}</span>
            <BasicButton variant="ghost" size="sm" data-testid="compose-why" @click="why = picked">{{ $t("leads.contact.why_no_mail") }}</BasicButton>
          </p>
          <p v-if="toError" class="t-negative m-0" role="alert" data-testid="compose-error">{{ toError }}</p>
        </FormField>
        <FormField :label="$t('leads.compose.subject')" required :error="errors.subject">
          <BasicInput v-model="form.subject" :maxlength="255" data-testid="compose-subject" />
        </FormField>
      </div>
      <FormField :label="$t('leads.compose.body')" required :error="errors.body">
        <BasicTextarea v-model="form.body" :maxlength="20000" :rows="8" data-testid="compose-body" />
      </FormField>
      <div v-if="reply" class="flex-column gap-2">
        <BasicButton variant="ghost" size="sm" data-testid="compose-quote-toggle" @click="quoteOpen = !quoteOpen">
          {{ $t("leads.compose.answering", { excerpt: excerpt }) }}
        </BasicButton>
        <blockquote v-if="quoteOpen" class="compose__quote m-0 t-secondary">{{ reply.body || reply.excerpt }}</blockquote>
      </div>
      <p class="t-muted m-0">{{ $t("leads.compose.footer_note") }}</p>
    </div>
    <template #footer>
      <ActionBar :labelled="false">
        <BasicButton :disabled="sending" data-testid="compose-cancel" @click="askClose(false)">{{ $t("leads.task.close") }}</BasicButton>
        <BasicTooltip v-if="blocked || !recipients.length" :text="blocked ? blockReasonLabel(blocked) : $t('leads.compose.no_contact')">
          <BasicButton variant="primary" disabled data-testid="compose-send">{{ $t("leads.compose.send") }}</BasicButton>
        </BasicTooltip>
        <BasicButton v-else variant="primary" mutates :loading="sending" data-testid="compose-send" @click="send">{{ $t("leads.compose.send") }}</BasicButton>
      </ActionBar>
    </template>
    <ConfirmDialog
      :open="discarding"
      :title="$t('leads.compose.discard_title')"
      :confirm-label="$t('leads.compose.discard')"
      :cancel-label="$t('leads.compose.keep')"
      confirm-testid="compose-discard-confirm"
      @confirm="discard"
      @cancel="discarding = false"
    />
    <SendCheckDialog :contact="why" :company-id="company.id" @close="why = null" />
  </BasicModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { t } from "@/i18n";
import { GET_WaitingMessages } from "@/api/communicator/api";
import { GET_Mailable, POST_Compose } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { blockReasonLabel, sendStateSentence } from "@/utils/leadsLabels";
import { apiErrorCode } from "@/utils/leadsOutbound";
import { replySubject } from "@/utils/leadsReply";
import { sendState } from "@/utils/leadsTime";
import SendCheckDialog from "./SendCheckDialog.vue";

// Write mail (ux/screens/compose.md): a hand-written mail to one contact of the company, optionally the answer to a
// reply (`reply` { id, subject, body, contact_id }). The outreach gate decides: a blocked contact disables Send with
// the reason; a 409 refusal shows under To.
const props = defineProps({
  open: { type: Boolean, default: false },
  company: { type: Object, required: true },
  reply: { type: Object, default: null },
});
const emit = defineEmits(["update:open", "sent"]);
const notify = useNotifyStore();
const form = reactive({ contactId: null, subject: "", body: "" });
const errors = reactive({});
const sending = ref(false);
const discarding = ref(false);
const quoteOpen = ref(false);
const blocked = ref("");
const toError = ref("");
const why = ref(null);

const mailable = computed(() => props.company.contacts.filter((contact) => contact.email && !contact.anonymised_at));
const recipients = computed(() =>
  mailable.value.map((contact) => ({
    value: contact.id,
    label: `${contact.first_name} ${contact.last_name}`.trim() || contact.email,
    description: contact.email,
  }))
);
const picked = computed(() => mailable.value.find((contact) => contact.id === form.contactId) || null);
const excerpt = computed(() => (props.reply?.body || props.reply?.excerpt || "").slice(0, 60));
const typed = computed(() => Boolean(form.subject.trim() || form.body.trim()));

function reset() {
  const primary = mailable.value.find((contact) => contact.is_primary) || mailable.value[0];
  Object.assign(form, {
    contactId: props.reply?.contact_id ?? primary?.id ?? null,
    subject: replySubject(props.reply?.subject),
    body: "",
  });
  Object.keys(errors).forEach((key) => delete errors[key]);
  toError.value = "";
  quoteOpen.value = false;
  check(form.contactId);
}

// The picked contact's gate answer: the first reason when blocked.
async function check(contactId) {
  blocked.value = "";
  if (!contactId) return;
  try {
    const { data } = await GET_Mailable(props.company.id, contactId);
    if (contactId === form.contactId && !data.eligible) blocked.value = data.reasons[0] || "blocked";
  } catch {
    blocked.value = "";
  }
}

watch(() => props.open, (open) => open && reset());
watch(() => form.contactId, check);

function askClose(value) {
  if (value || sending.value) return;
  if (typed.value) discarding.value = true;
  else emit("update:open", false);
}

function discard() {
  discarding.value = false;
  emit("update:open", false);
}

function validate() {
  Object.keys(errors).forEach((key) => delete errors[key]);
  if (!form.subject.trim()) errors.subject = t("leads.compose.required");
  if (!form.body.trim()) errors.body = t("leads.compose.required");
  return !errors.subject && !errors.body;
}

const body = () => ({ contact_id: form.contactId, subject: form.subject.trim(), body: form.body, ...(props.reply ? { reply_id: props.reply.id } : {}) });

async function queuedState(messageId) {
  const waiting = await GET_WaitingMessages().catch(() => []);
  const mail = waiting.find((item) => item.id === messageId);
  return mail ? sendStateSentence(sendState(mail.next_slot)) : t("leads.send_state.unknown");
}

async function send() {
  if (!validate()) return;
  sending.value = true;
  toError.value = "";
  try {
    const { data } = await POST_Compose(props.company.id, body());
    notify.spawnNotification({ msg: t("leads.compose.queued", { state: await queuedState(data.message_id) }), type: "positive" });
    emit("update:open", false);
    emit("sent");
  } catch (err) {
    refused(err);
  } finally {
    sending.value = false;
  }
}

// not_eligible / no_legal_basis: under To, the dialog stays; anything else: a toast and the dialog closes.
function refused(err) {
  const code = apiErrorCode(err);
  if (code === "no_legal_basis") toError.value = t("leads.compose.no_legal_basis");
  else if (code === "not_eligible") toError.value = extractApiMessage(err, t("leads.compose.error"));
  if (toError.value) return;
  notify.spawnNotification({ msg: extractApiMessage(err, t("leads.compose.error")), type: "negative" });
  emit("update:open", false);
}
</script>

<style scoped>
.compose__quote {
  padding-left: var(--space-4);
  border-left: 3px solid var(--border-subtle);
  white-space: pre-wrap;
}
</style>
