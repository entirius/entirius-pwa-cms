<template>
  <PageLayout data-testid="leads-sending-health">
    <template #header>
      <PageHeader :title="$t('leads.health.title')" :back="{ name: 'LeadsSettings' }">
        <template v-if="!loading" #actions>
          <StatusBadge v-if="isDirty" tone="warning" :dot="false" :label="$t('unsaved.changes')" />
          <ActionBar :actions="actions" />
        </template>
      </PageHeader>
    </template>

    <Loader v-if="loading" block />
    <p v-else-if="error" class="t-negative m-0" role="alert" data-testid="health-error">{{ error }}</p>
    <div v-else class="flex-column gap-8">
      <ReadonlyOff>
        <SegmentedControl v-model="range" :options="ranges" :aria-label="$t('leads.health.range')" data-testid="health-range" />
      </ReadonlyOff>

      <BasicCard :title="$t('leads.health.channel')" gap data-testid="health-channel">
        <p class="m-0 flex flex-wrap ai-ct gap-5">
          <span>{{ $t("leads.health.col_sent") }}: {{ channel.sent }}</span>
          <span v-for="rate in RATES" :key="rate.key" class="flex ai-ct gap-2">
            {{ $t(rate.label) }}: {{ pct(channel[rate.key]) }}
            <StatusBadge v-if="overLimit(channel[rate.key], rate)" tone="warning" size="sm" :label="$t('leads.health.over')" data-testid="health-channel-over" />
          </span>
        </p>
      </BasicCard>

      <BasicCard :title="$t('leads.health.mailboxes')" gap data-testid="health-mailboxes">
        <p v-if="!rows.length" class="m-0">
          {{ $t("leads.health.no_mailbox") }} ·
          <router-link :to="{ name: 'LeadsMailboxes' }" class="t-accent">{{ $t("leads.mailboxes.title") }}</router-link>
        </p>
        <DataTable v-else :columns="columns" :rows="rows" row-key="id" :row-attrs="rowAttrs">
          <template #cell-address="{ row }">
            <router-link :to="{ name: 'LeadsMailboxEdit', params: { id: row.id } }" class="t-accent">{{ row.address }}</router-link>
          </template>
          <template #cell-state="{ row }">
            <StatusBadge :tone="MAILBOX_TONES[row.stateKey]" :label="mailboxStateLabel(row.stateKey)" :title="row.pause_reason" />
          </template>
          <template v-for="rate in RATES" :key="rate.key" #[`cell-${rate.key}`]="{ row }">
            <!-- over the limit, the figure is the warning badge itself: one item per cell keeps Resume on screen (N22) -->
            <StatusBadge v-if="over(row, rate)" tone="warning" size="sm" :label="pct(row.metrics[rate.key])" :title="$t('leads.health.over')" data-testid="health-over" />
            <span v-else :class="{ 't-muted': row.tooFew }" :title="row.tooFew ? $t('leads.health.too_few') : ''">{{ pct(row.metrics[rate.key]) }}</span>
          </template>
          <template #cell-actions="{ row }">
            <BasicButton v-if="row.paused_at" mutates size="sm" data-testid="health-resume" @click="reasonFor = row">
              {{ $t("leads.mailboxes.resume") }}
            </BasicButton>
          </template>
        </DataTable>
      </BasicCard>

      <BasicCard :title="$t('leads.health.policy')" gap data-testid="health-policy">
        <div class="form-grid">
          <BasicSwitch v-model="policy.enabled" class="form-grid__wide" :label="$t('leads.health.enabled')" data-testid="health-enabled" />
          <p v-if="!policy.enabled" class="form-grid__wide t-muted m-0">{{ $t("leads.health.off") }}</p>
          <FormField v-for="field in POLICY_FIELDS" :key="field.key" :label="$t(field.label)" :disabled="!policy.enabled" :error="fieldError(field.key)">
            <NumberInput v-if="field.integer" v-model="policy[field.key]" :min="1" :disabled="!policy.enabled" :data-testid="field.testid" />
            <BasicInput v-else v-model="policy[field.key]" format="percent" :disabled="!policy.enabled" :data-testid="field.testid" />
          </FormField>
        </div>
      </BasicCard>

      <BasicCard :title="$t('leads.health.log')" gap data-testid="health-log">
        <DataTable :columns="logColumns" :rows="logRows" row-key="id" :row-attrs="() => ({ 'data-testid': 'health-log-row' })" :empty-text="$t('leads.health.log_empty')">
          <template #cell-action="{ row }">
            <StatusBadge :tone="row.action === 'pause' ? 'warning' : 'positive'" :label="$t(`leads.mailboxes.${row.action}`)" />
          </template>
        </DataTable>
        <BasicButton v-if="logNext" data-testid="health-log-more" @click="moreLog">{{ $t("leads.health.show_more") }}</BasicButton>
      </BasicCard>
    </div>
    <MailboxReasonDialog :mailbox="reasonFor" @close="reasonFor = null" @done="refreshReport" />
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_Health, GET_HealthLog, GET_HealthPolicy, PUT_HealthPolicy } from "@/api/communicator/api";
import { fieldText } from "@/utils/leadsForm";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { ReadonlyOff } from "@/composables/useReadonly";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { formatDate } from "@/utils/format";
import { healthTriggerLabel, mailboxStateLabel } from "@/utils/leadsLabels";
import { MAILBOX_TONES, mailboxState, sentToday } from "@/utils/leadsOutbound";
import MailboxReasonDialog from "./MailboxReasonDialog.vue";
import { saveAction } from "./saveAction";

// Is mail getting through: the channel and each mailbox over 24 h or 7 d, the automatic-pause policy (the page's one
// Save) and the log of every pause and resume. A rate over its limit says so; below the minimum sample it is muted.
const RATES = [
  { key: "hard_bounces_pct", label: "leads.health.col_bounces", limit: "max_bounce_pct" },
  { key: "optouts_pct", label: "leads.health.col_optouts", limit: "max_optout_pct" },
  { key: "complaints_pct", label: "leads.health.col_complaints", limit: "max_complaint_pct" },
];
const POLICY_FIELDS = [
  { key: "window_hours", label: "leads.health.window_hours", integer: true, testid: "health-window-hours" },
  { key: "min_sample", label: "leads.health.min_sample", integer: true, testid: "health-min-sample" },
  { key: "max_bounce_pct", label: "leads.health.max_bounce", testid: "health-max-bounce" },
  { key: "max_optout_pct", label: "leads.health.max_optout", testid: "health-max-optout" },
  { key: "max_complaint_pct", label: "leads.health.max_complaint", testid: "health-max-complaint" },
];
// The report's windows are keyed by their alias: "24h", "7d".
const ranges = [
  { value: "24h", label: t("leads.health.window_24h") },
  { value: "7d", label: t("leads.health.window_7d") },
];

const formErrors = useFormErrors();
const { snapshot, track, isDirty } = useUnsavedChanges();
const loading = ref(true);
const error = ref("");
const saving = ref(false);
const range = ref("7d");
const report = ref({ channel: { windows: {} }, mailboxes: [] });
const policy = reactive({});
const savedPolicy = ref({});
const logRows = ref([]);
const logPage = ref(1);
const logNext = ref(false);
const reasonFor = ref(null);

const channel = computed(() => report.value.channel.windows[range.value] || {});
const rows = computed(() =>
  report.value.mailboxes.map((mailbox) => {
    const metrics = mailbox.windows[range.value];
    const today = sentToday(mailbox.sent_today, mailbox.cap_today);
    const stateKey = mailboxState(mailbox, mailbox.cap_today);
    return { ...mailbox, metrics, today, stateKey, sent: metrics.sent, tooFew: metrics.sent < policy.min_sample };
  })
);
const columns = [
  { key: "address", label: t("leads.health.col_mailbox"), width: "1fr" },
  { key: "state", label: t("leads.mailboxes.col_state"), width: "max-content" },
  { key: "sent", label: t("leads.health.col_sent"), numeric: true, priority: 2 },
  ...RATES.map((rate) => ({ key: rate.key, label: t(rate.label), width: "max-content", priority: 3 })),
  { key: "today", label: t("leads.health.col_today"), numeric: true, priority: 2 },
  { key: "actions", label: "", actions: true },
];
const logColumns = [
  // the date and the time may take two lines: on a phone the row keeps its Action inside the card
  { key: "when", label: t("leads.health.col_when"), width: "min-content", truncate: false },
  { key: "mailbox", label: t("leads.health.col_mailbox"), width: "1fr" },
  { key: "action", label: t("leads.health.col_action"), width: "max-content" },
  { key: "why", label: t("leads.health.col_why"), width: "max-content", priority: 2 },
  { key: "reason", label: t("leads.health.col_reason"), width: "max-content", priority: 3 },
  { key: "by", label: t("leads.health.col_by"), width: "max-content", priority: 3 },
];
const actions = computed(() => [
  saveAction({ dirty: isDirty.value, saving: saving.value, testid: "health-save", onClick: save }),
]);

const pct = (value) => (value === null || value === undefined ? "—" : `${value} %`);
// A rate over its limit is flagged even below the minimum sample (the automatic pause waits for it, a person need not);
// the muted figure and its title still say the sample is small. The limit is the saved one, not the field being typed.
const overLimit = (value, rate) => value !== null && value !== undefined && value > Number(savedPolicy.value[rate.limit]);
const over = (row, rate) => overLimit(row.metrics[rate.key], rate);
const rowAttrs = (row) => ({ "data-testid": "health-row", "data-mailbox": row.id });
const fieldError = (field) => fieldText(formErrors.getFieldError(field)?.msg, field);
const addressOf = (id) => report.value.mailboxes.find((mailbox) => mailbox.id === id)?.address || `#${id}`;

// Who paused or resumed: the person's name; an automatic pause has no user. An older backend sends no name: "—".
const byOf = (entry) => (entry.user_id ? entry.user_name || "—" : t("leads.health.by_system"));

// n3: an automatic pause reads "20 % of 5 sent" from its trigger's rate in the stored metrics (the Why column names
// the trigger); a manual entry, or one without the figure, keeps the stored reason.
const TRIGGER_RATES = { bounce: "hard_bounces_pct", optout: "optouts_pct", complaint: "complaints_pct" };
function reasonOf(entry) {
  const rate = entry.metrics?.[TRIGGER_RATES[entry.trigger]];
  if (rate === null || rate === undefined) return entry.reason;
  return t("leads.health.reason_line", { rate: pct(rate), sent: entry.metrics.sent });
}

const logRow = (entry) => ({
  ...entry,
  reason: reasonOf(entry),
  when: formatDate(entry.created_at),
  mailbox: addressOf(entry.mailbox_id),
  why: healthTriggerLabel(entry.trigger),
  by: byOf(entry),
});

async function loadLog(page = 1) {
  const { data } = await GET_HealthLog({ page });
  const entries = (data.results || []).map(logRow);
  logRows.value = page === 1 ? entries : [...logRows.value, ...entries];
  logPage.value = page;
  logNext.value = Boolean(data.next);
}

async function moreLog() {
  try {
    await loadLog(logPage.value + 1);
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.health.load_error"));
  }
}

// After a Resume: the rates and the log again; the policy being edited stays as typed.
async function refreshReport() {
  try {
    report.value = (await GET_Health()).data;
    await loadLog();
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.health.load_error"));
  }
}

async function load() {
  error.value = "";
  try {
    const [health, rules] = await Promise.all([GET_Health(), GET_HealthPolicy()]);
    report.value = health.data;
    Object.assign(policy, rules.data);
    savedPolicy.value = { ...rules.data };
    snapshot(policy);
    track(policy);
    await loadLog();
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.health.load_error"));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  formErrors.clearErrors();
  try {
    const body = Object.fromEntries(POLICY_FIELDS.map(({ key }) => [key, Number(policy[key])]));
    Object.assign(policy, (await PUT_HealthPolicy({ enabled: policy.enabled, ...body })).data);
    savedPolicy.value = { ...policy };
    snapshot(policy);
  } catch (err) {
    formErrors.handleApiError(err);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
