<template>
  <PageLayout data-testid="leads-mailbox-edit">
    <template #header>
      <PageHeader :title="title" :back="{ name: 'LeadsMailboxes' }">
        <template v-if="stored" #meta>
          <StatusBadge :tone="MAILBOX_TONES[stateKey]" :label="stateText" data-testid="mailbox-state" />
        </template>
        <template v-if="!loading && !notFound" #actions>
          <StatusBadge v-if="isDirty" tone="warning" :dot="false" :label="$t('unsaved.changes')" />
          <ActionBar :actions="actions" />
        </template>
      </PageHeader>
    </template>

    <Loader v-if="loading" block />
    <EmptyState v-else-if="notFound" icon="empty" :title="$t('leads.mailbox.not_found')" data-testid="mailbox-not-found">
      <router-link :to="{ name: 'LeadsMailboxes' }" class="t-accent">{{ $t("leads.mailboxes.title") }}</router-link>
    </EmptyState>
    <div v-else class="flex-column gap-8">
      <p v-if="stateKey === 'needs_login'" class="t-negative m-0" role="alert">{{ $t("leads.mailbox.needs_login") }}</p>
      <p v-if="error" class="t-negative m-0" role="alert" data-testid="mailbox-error">{{ error }}</p>

      <BasicCard :title="$t('leads.mailbox.sender')">
        <div class="form-grid">
          <FormField :label="$t('leads.mailbox.address')" required :hint="$t('leads.mailbox.address_hint')" hint-level="important" :error="fieldError('address')">
            <BasicInput v-model="form.address" format="email" :maxlength="254" data-testid="mailbox-address" />
          </FormField>
          <FormField :label="$t('leads.mailbox.display_name')" :error="fieldError('display_name')">
            <BasicInput v-model="form.display_name" :maxlength="128" data-testid="mailbox-display-name" />
          </FormField>
          <FormField :label="$t('leads.mailbox.cc')" :error="fieldError('cc_address')">
            <BasicInput v-model="form.cc_address" format="email" :maxlength="254" data-testid="mailbox-cc" />
          </FormField>
          <FormField :label="$t('leads.mailbox.user')" :error="fieldError('user_id')">
            <BasicSelect v-model="form.user_id" searchable clearable :options="userOptions" data-testid="mailbox-user" />
          </FormField>
          <BasicSwitch v-model="form.is_default" :label="$t('leads.mailbox.is_default')" data-testid="mailbox-default" />
        </div>
      </BasicCard>

      <BasicCard :title="$t('leads.mailbox.sending')">
        <div class="form-grid">
          <BasicSwitch v-model="form.send_enabled" class="form-grid__wide" :label="$t('leads.mailbox.send_enabled')" data-testid="mailbox-send-enabled" />
          <FormField :label="$t('leads.mailbox.smtp_host')" required :error="fieldError('smtp_host')">
            <BasicInput v-model="form.smtp_host" :maxlength="255" data-testid="mailbox-smtp-host" />
          </FormField>
          <FormField :label="$t('leads.mailbox.port')" required :error="fieldError('smtp_port')">
            <NumberInput v-model="form.smtp_port" :min="1" :max="65535" data-testid="mailbox-smtp-port" />
          </FormField>
          <FormField :label="$t('leads.mailbox.security')" :error="fieldError('smtp_security')">
            <BasicRadioGroup v-model="form.smtp_security" :options="securityOptions" data-testid="mailbox-smtp-security" />
          </FormField>
          <FormField :label="$t('leads.mailbox.login_user')" :error="fieldError('smtp_user')">
            <BasicInput v-model="form.smtp_user" :maxlength="254" data-testid="mailbox-smtp-user" />
          </FormField>
          <FormField :label="$t('leads.mailbox.password')" :error="fieldError('smtp_password')">
            <BasicInput v-model="form.smtp_password" type="password" autocomplete="new-password" :placeholder="savedHint('smtp')" data-testid="mailbox-smtp-password" />
          </FormField>
        </div>
      </BasicCard>

      <BasicCard :title="$t('leads.mailbox.replies')">
        <div class="form-grid">
          <BasicSwitch v-model="form.receive_enabled" class="form-grid__wide" :label="$t('leads.mailbox.receive_enabled')" data-testid="mailbox-receive-enabled" />
          <FormField :label="$t('leads.mailbox.imap_host')" :error="fieldError('imap_host')">
            <BasicInput v-model="form.imap_host" :maxlength="255" data-testid="mailbox-imap-host" />
          </FormField>
          <FormField :label="$t('leads.mailbox.port')" :error="fieldError('imap_port')">
            <NumberInput v-model="form.imap_port" :min="1" :max="65535" data-testid="mailbox-imap-port" />
          </FormField>
          <BasicSwitch v-model="form.imap_use_ssl" :label="$t('leads.mailbox.ssl')" data-testid="mailbox-imap-ssl" />
          <FormField :label="$t('leads.mailbox.login_user')" :error="fieldError('imap_user')">
            <BasicInput v-model="form.imap_user" :maxlength="254" data-testid="mailbox-imap-user" />
          </FormField>
          <FormField :label="$t('leads.mailbox.password')" :error="fieldError('imap_password')">
            <BasicInput v-model="form.imap_password" type="password" autocomplete="new-password" :placeholder="savedHint('imap')" data-testid="mailbox-imap-password" />
          </FormField>
          <FormField :label="$t('leads.mailbox.folder')" :error="fieldError('folder')">
            <BasicInput v-model="form.folder" :maxlength="128" data-testid="mailbox-folder" />
          </FormField>
        </div>
      </BasicCard>

      <BasicCard :title="$t('leads.mailbox.limits')">
        <div class="form-grid">
          <FormField :label="$t('leads.mailbox.daily_cap')" required :hint="$t('leads.mailbox.cap_hint')" hint-level="important" :error="fieldError('daily_cap')">
            <NumberInput v-model="form.daily_cap" :min="0" data-testid="mailbox-daily-cap" />
          </FormField>
          <FormField :label="$t('leads.mailbox.warmup_start')" :error="fieldError('warmup_start_cap')">
            <NumberInput v-model="form.warmup_start_cap" :min="0" data-testid="mailbox-warmup-start" />
          </FormField>
          <FormField :label="$t('leads.mailbox.warmup_step')" :error="fieldError('warmup_step')">
            <NumberInput v-model="form.warmup_step" :min="0" data-testid="mailbox-warmup-step" />
          </FormField>
          <FormField :label="$t('leads.mailbox.warmup_from')" :error="fieldError('warmup_started_on')">
            <BasicDatePicker v-model="form.warmup_started_on" data-testid="mailbox-warmup-from" />
          </FormField>
          <p v-if="today" class="form-grid__wide m-0" data-testid="mailbox-today">{{ today }}</p>
        </div>
      </BasicCard>

      <BasicCard v-if="test" :title="$t('leads.mailbox.login_test')">
        <div class="flex ai-ct flex-wrap gap-5">
          <span class="flex ai-ct gap-2">SMTP <StatusBadge v-bind="testBadge(test.smtp)" data-testid="mailbox-test-smtp" /></span>
          <span class="flex ai-ct gap-2">IMAP <StatusBadge v-bind="testBadge(test.imap)" data-testid="mailbox-test-imap" /></span>
        </div>
      </BasicCard>
    </div>

    <MailboxReasonDialog :mailbox="reasonFor" @close="reasonFor = null" @done="load" />
    <ConfirmDialog
      :open="deleting"
      :title="$t('leads.mailbox.delete')"
      :message="$t('leads.mailbox.delete_confirm', { address: stored?.address })"
      :confirm-label="$t('leads.common.delete')"
      :cancel-label="$t('leads.common.keep')"
      tone="danger"
      confirm-testid="mailbox-delete-confirm"
      @confirm="remove"
      @cancel="deleting = false"
    />
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { DELETE_Mailbox, GET_Health, GET_Mailbox, PATCH_Mailbox, POST_Mailbox, POST_MailboxTest } from "@/api/communicator/api";
import { GET_AssignableUsers } from "@/api/leads/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { useNotifyStore } from "@/stores/notify";
import { mailboxStateLabel } from "@/utils/leadsLabels";
import { MAILBOX_TONES, mailboxState } from "@/utils/leadsOutbound";
import MailboxReasonDialog from "./MailboxReasonDialog.vue";

// One mailbox (`:id` = "new" adds one): sender, SMTP, IMAP, caps and warm-up. Passwords are write-only: the API says
// only whether one is stored ("saved" as the placeholder); an empty field keeps it and is never sent.
const EMPTY = {
  address: "", display_name: "", cc_address: "", user_id: null, is_default: false,
  send_enabled: true, smtp_host: "", smtp_port: 587, smtp_security: "starttls", smtp_user: "", smtp_password: "",
  receive_enabled: false, imap_host: "", imap_port: 993, imap_use_ssl: true, imap_user: "", imap_password: "", folder: "INBOX",
  daily_cap: 0, warmup_start_cap: null, warmup_step: 0, warmup_started_on: null,
};
const PASSWORDS = ["smtp_password", "imap_password"];
const NULLABLE = ["user_id", "daily_cap", "warmup_start_cap", "warmup_started_on"];

const route = useRoute();
const router = useRouter();
const notify = useNotifyStore();
const formErrors = useFormErrors();
const { snapshot, track, isDirty } = useUnsavedChanges();

const form = reactive({ ...EMPTY });
const stored = ref(null);
const health = ref(null);
const users = ref([]);
const loading = ref(true);
const notFound = ref(false);
const error = ref("");
const busy = ref("");
const test = ref(null);
const reasonFor = ref(null);
const deleting = ref(false);

const isNew = computed(() => route.params.id === "new");
const title = computed(() => stored.value?.address || t("leads.mailboxes.add"));
const stateKey = computed(() => (stored.value ? mailboxState(stored.value, health.value?.cap_today ?? null) : ""));
const stateText = computed(() =>
  stored.value?.paused_at ? t("leads.mailbox.paused_by", { reason: stored.value.pause_reason }) : mailboxStateLabel(stateKey.value)
);
const today = computed(() => health.value && t("leads.mailbox.today", { sent: health.value.sent_today, cap: health.value.cap_today ?? "—" }));
const securityOptions = [
  { value: "starttls", label: "STARTTLS" },
  { value: "ssl", label: "SSL" },
];
const userOptions = computed(() => users.value.map((user) => ({ value: user.id, label: user.name || user.username })));

const actions = computed(() => {
  const list = [{ key: "save", role: "primary", label: t("common.save"), loading: busy.value === "save", testid: "mailbox-save", onClick: save }];
  if (isNew.value) return list;
  const paused = Boolean(stored.value?.paused_at);
  return [
    { key: "delete", role: "utility", icon: "delete", label: t("leads.mailbox.delete"), mutates: true, testid: "mailbox-delete", onClick: () => (deleting.value = true) },
    { key: "pause", role: "secondary", label: t(paused ? "leads.mailboxes.resume" : "leads.mailboxes.pause"), mutates: true, testid: paused ? "mailbox-resume" : "mailbox-pause", onClick: () => (reasonFor.value = stored.value) },
    { key: "test", role: "secondary", label: t("leads.mailbox.test"), mutates: true, loading: busy.value === "test", testid: "mailbox-test", onClick: runTest },
    ...list,
  ];
});

const fieldError = (field) => formErrors.getFieldError(field)?.msg || "";
const savedHint = (kind) => (stored.value?.[`${kind}_password_set`] ? t("leads.mailbox.password_saved") : "");
const testBadge = (code) =>
  code === "ok"
    ? { tone: "positive", label: t("leads.mailbox.test_ok") }
    : { tone: "negative", label: t("leads.mailbox.test_failed", { code }) };

function fill(mailbox) {
  stored.value = mailbox.id ? mailbox : null;
  Object.keys(EMPTY).forEach((key) => (form[key] = PASSWORDS.includes(key) ? "" : (mailbox[key] ?? EMPTY[key])));
  snapshot(form);
  track(form);
}

// What the API takes: an empty password keeps the stored one, an empty nullable number clears it.
function body() {
  const out = {};
  for (const [key, value] of Object.entries(form)) {
    if (PASSWORDS.includes(key) && !value) continue;
    out[key] = NULLABLE.includes(key) && (value === "" || value === undefined) ? null : value;
  }
  return out;
}

async function loadExtras(id) {
  const [report, people] = await Promise.allSettled([id ? GET_Health() : Promise.reject(), GET_AssignableUsers()]);
  if (report.status === "fulfilled") health.value = report.value.data.mailboxes.find((row) => row.id === id) || null;
  if (people.status === "fulfilled") users.value = people.value;
}

async function load() {
  try {
    if (isNew.value) fill({ ...EMPTY });
    else fill((await GET_Mailbox(route.params.id)).data);
    await loadExtras(stored.value?.id);
  } catch (err) {
    if ((err?.httpStatus ?? err?.response?.status) === 404) notFound.value = true;
    else error.value = extractApiMessage(err, t("leads.mailboxes.load_error"));
  } finally {
    loading.value = false;
  }
}

async function save() {
  busy.value = "save";
  error.value = "";
  formErrors.clearErrors();
  try {
    const { data } = isNew.value ? await POST_Mailbox(body()) : await PATCH_Mailbox(stored.value.id, body());
    fill(data);
    if (isNew.value) router.replace({ name: "LeadsMailboxEdit", params: { id: data.id } });
  } catch (err) {
    formErrors.handleApiError(err);
    error.value = extractApiMessage(err, t("leads.mailbox.save_error"));
  } finally {
    busy.value = "";
  }
}

async function runTest() {
  busy.value = "test";
  try {
    test.value = (await POST_MailboxTest(stored.value.id)).data;
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.mailbox.save_error"));
  } finally {
    busy.value = "";
  }
}

async function remove() {
  deleting.value = false;
  try {
    await DELETE_Mailbox(stored.value.id);
    snapshot(form);
    router.push({ name: "LeadsMailboxes" });
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.mailbox.save_error")), type: "negative" });
  }
}

onMounted(load);
</script>
