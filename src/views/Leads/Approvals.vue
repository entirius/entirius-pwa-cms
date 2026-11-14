<template>
  <PageLayout data-testid="leads-approvals">
    <template #header>
      <PageHeader :title="$t('leads.approvals.title')">
        <template #actions>
          <ActionBar :actions="headerActions" />
        </template>
      </PageHeader>
    </template>
    <template #toolbar>
      <div class="flex ai-ct flex-wrap gap-5">
        <BasicInput
          v-model="search"
          icon="search"
          :placeholder="$t('leads.approvals.search')"
          data-testid="approvals-search"
          @input="debouncedFetch(reload)"
        />
        <MobileFilterPanel :active-count="activeFilters" :trigger-label="$t('leads.approvals.filters')" data-testid="approvals-filters">
          <BasicSelect v-model="filters.channel" :floating-label="$t('leads.approvals.channel')" clearable :options="channelOptions" data-testid="approvals-channel" />
          <BasicSelect v-model="filters.template_key" :floating-label="$t('leads.approvals.template')" clearable :options="templateOptions" data-testid="approvals-template" />
          <BasicSelect v-model="filters.mailbox" :floating-label="$t('leads.approvals.mailbox')" clearable :options="mailboxOptions" data-testid="approvals-mailbox" />
          <BasicSelect v-model="filters.min_age_hours" :floating-label="$t('leads.approvals.age')" clearable :options="ageOptions" data-testid="approvals-age" />
        </MobileFilterPanel>
      </div>
    </template>

    <Loader v-if="loading && first" block />
    <p v-else-if="error" class="t-negative m-0" role="alert" data-testid="approvals-error">{{ error }}</p>
    <EmptyState v-else-if="!rows.length && !filtered" icon="success" size="md" :title="$t('leads.approvals.empty')" :message="$t('leads.approvals.empty_message')" data-testid="approvals-empty" />
    <div v-else class="flex-column gap-5">
      <DataTable
        ref="table"
        :columns="columns"
        :rows="rows"
        row-key="id"
        :selectable="!readonly"
        multi-select
        :row-attrs="rowAttrs"
        :empty-text="$t('leads.approvals.empty_filtered')"
        data-testid="approvals-table"
        @select="selected = $event.map((row) => row.id)"
      >
        <template #cell-recipient="{ row }">
          <router-link v-if="companyIdOf(row)" class="t-accent" :to="{ name: 'LeadsThread', params: { id: companyIdOf(row) } }" data-testid="approval-company">
            {{ row.subject_label }}
          </router-link>
          <span v-if="companyIdOf(row)" class="t-muted"> · </span>{{ recipientName(row) }}
        </template>
        <template #cell-channel="{ row }"><StatusBadge tone="neutral" :dot="false" :label="channelName(row.channel)" /></template>
        <template #cell-age="{ row }">{{ ageOf(row) }}</template>
        <template #cell-problem="{ row }">
          <StatusBadge
            v-if="problemOf(row)"
            tone="warning"
            :label="$t('leads.approvals.problem')"
            :title="problemOf(row)"
            data-testid="approval-problem"
          />
        </template>
        <template #cell-actions="{ row }">
          <IconButton icon="next" variant="ghost" size="sm" :label="$t('leads.approvals.open')" data-testid="approval-open" @click="open(row)" />
        </template>
      </DataTable>
    </div>
    <!-- the bulk bar rides the pinned footer above the pager: in sight while the list scrolls, and the rows never
         move when the first one is ticked (acceptance CM5) -->
    <template #footer>
      <BulkActionBar
        v-if="selection.length"
        :count="selection.length"
        selected-label-key="leads.approvals.selected"
        clear-label-key="leads.approvals.clear"
        :actions="bulkActions"
        data-testid="approvals-bulk"
        @action="onBulk"
        @clear="clearSelection"
      />
      <Pagination v-model:page="page" :pages="pages" :disabled="loading" @update:page="load" />
    </template>

    <BasicModal v-model:open="rejecting.open" :title="rejectTitle" size="sm" :actions="rejectActions" data-testid="approvals-reject-modal">
      <FormField :label="$t('leads.approvals.reason')" required :error="rejecting.error">
        <BasicTextarea v-model="rejecting.reason" :rows="3" :maxlength="255" data-testid="approvals-reject-reason" />
      </FormField>
    </BasicModal>

    <ConfirmDialog
      :open="approving.open"
      :title="approveTitle"
      :message="$t('leads.approvals.approve_confirm')"
      :confirm-label="$t('leads.approvals.approve')"
      confirm-testid="approvals-approve-confirm"
      @confirm="submitApprove"
      @cancel="approving.open = false"
    />

    <SideDrawer :visible="Boolean(drawerRow)" :title="drawerRow?.subject || ''" data-testid="approvals-drawer" @close="drawerRow = null">
      <div v-if="drawerRow" class="flex-column gap-5">
        <p class="m-0">{{ $t("leads.approvals.other_channel", { channel: channelName(drawerRow.channel) }) }}</p>
        <p class="m-0 t-secondary">{{ [drawerRow.subject_label, recipientName(drawerRow)].filter(Boolean).join(" · ") }}</p>
        <p v-if="problemOf(drawerRow)" class="m-0 flex ai-ct flex-wrap gap-3">
          <StatusBadge tone="warning" :label="$t('leads.approvals.problem')" />
          <span>{{ problemOf(drawerRow) }}</span>
        </p>
        <p class="approvals__preview m-0">{{ drawerRow.body_preview }}</p>
        <ActionBar :labelled="false" :actions="drawerActions" />
      </div>
    </SideDrawer>

    <SideDrawer :visible="logOpen" :title="$t('leads.approvals.log_title')" width="640px" data-testid="approvals-log-drawer" @close="logOpen = false">
      <Loader v-if="logLoading" />
      <DataTable v-else :columns="logColumns" :rows="logRows" row-key="id" :empty-text="$t('leads.approvals.log_empty')" />
    </SideDrawer>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_Approvals, GET_ApprovalsLog, POST_ApprovalsBulk } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { usePageReadonly } from "@/composables/useReadonly";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { useApprovalsStore } from "@/stores/approvals";
import { useLeadsChannelStore } from "@/stores/leadsChannel";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { formatDate } from "@/utils/format";
import { FROM_APPROVALS, problemText } from "@/utils/leadsOutbound";
import { pluralKey } from "@/utils/plural";
import { companyIdFromSubjectRef } from "@/utils/subjectRef";

// Drafts of every channel, oldest first, each with its problem; approved or rejected in bulk (≤ 100 ids a call: a
// larger selection goes in chunks and the answers sum into one toast). A row of the active channel opens Review; a row
// of another channel opens a drawer with its own Approve / Reject (the CMS works on one channel).
const PAGE_SIZE = 50;
const CHUNK = 100;
const AGES = [24, 72, 168];

const router = useRouter();
// A role without the review write area has no bulk action, so no selection checkboxes either (acceptance CM11).
const readonly = usePageReadonly();
const notify = useNotifyStore();
const approvalsStore = useApprovalsStore();
const activeChannel = useLeadsChannelStore().activeChannelIdx;
const pimChannels = usePimChannelStore();
const { search, debouncedFetch } = useSearchDebounce();

const filters = reactive({ channel: null, template_key: null, mailbox: null, min_age_hours: null });
const list = ref({ results: [], count: 0, counts: { by_channel: {}, by_mailbox: {} } });
const loading = ref(true);
const first = ref(true); // later loads keep the table (and its selection) on screen
const templates = ref(new Set()); // every template key seen: picking one must not shrink the choice
const error = ref("");
const page = ref(1);
const selected = ref([]);
const failed = ref({}); // id → why the last bulk call left it
const table = ref(null);
const drawerRow = ref(null);
const rejecting = reactive({ open: false, ids: [], reason: "", error: "" });
const approving = reactive({ open: false, ids: [] });
const logOpen = ref(false);
const logLoading = ref(false);
const logRows = ref([]);

const rows = computed(() => list.value.results || []);
const pages = computed(() => Math.ceil((list.value.count || 0) / PAGE_SIZE));
const selection = computed(() => selected.value.filter((id) => rows.value.some((row) => row.id === id)));
const activeFilters = computed(() => Object.values(filters).filter((value) => value !== null).length);
const filtered = computed(() => activeFilters.value > 0 || Boolean(search.value));

const columns = [
  { key: "recipient", label: t("leads.approvals.col_recipient"), width: "1fr" },
  { key: "subject", label: t("leads.approvals.col_subject"), width: "1fr", priority: 2 },
  { key: "channel", label: t("leads.approvals.channel"), width: "max-content", priority: 3 },
  { key: "template_key", label: t("leads.approvals.template"), width: "max-content", truncate: false, priority: 3 },
  { key: "age", label: t("leads.approvals.col_age"), numeric: true, priority: 2 },
  { key: "problem", label: t("leads.approvals.col_problem"), width: "max-content" },
  { key: "actions", label: "", actions: true },
];
const logColumns = [
  { key: "when", label: t("leads.approvals.log_when"), width: "max-content" },
  { key: "action", label: t("leads.approvals.log_action"), width: "max-content" },
  { key: "count", label: t("leads.approvals.log_count"), numeric: true },
  { key: "reason", label: t("leads.approvals.reason"), width: "1fr", priority: 2 },
];

const optionsOf = (keys, label = (key) => key) => keys.map((value) => ({ value, label: label(value) }));
const channelOptions = computed(() => optionsOf(Object.keys(list.value.counts?.by_channel || {}), channelName));
const mailboxOptions = computed(() =>
  optionsOf(Object.keys(list.value.counts?.by_mailbox || {}).filter((key) => key !== "none"))
);
const templateOptions = computed(() => optionsOf([...templates.value]));
const ageOptions = AGES.map((hours, i) => ({ value: hours, label: t(`leads.approvals.age_${["1d", "3d", "7d"][i]}`) }));

const recipientName = (row) => row.recipient_name || row.recipient_email;
// The company of the row (its card is one click away) comes from the thread's label and reference, never shown raw.
const companyIdOf = (row) => (row.subject_label && companyIdFromSubjectRef(row.subject_ref)) || null;
const channelName = (idx) => pimChannels.channels.find((channel) => channel.idx === idx)?.name || idx;
const ageOf = (row) => t("leads.approvals.age_days", { n: Math.floor(row.age_hours / 24) });
const problemOf = (row) => failed.value[row.id] || (row.blocker ? problemText(row.blocker) : "");
const rowAttrs = (row) => ({ "data-testid": "approval-row", "data-approval": row.id, "data-channel": row.channel });

const headerActions = computed(() => [
  { key: "log", role: "utility", icon: "history", label: t("leads.approvals.log"), onClick: openLog, testid: "approvals-log" },
]);
const bulkActions = [
  { key: "approve", labelKey: "leads.approvals.approve", testid: "approvals-approve" },
  { key: "reject", labelKey: "leads.approvals.reject", variant: "danger", testid: "approvals-reject" },
];
const drawerActions = computed(() => [
  { key: "reject", role: "danger", label: t("leads.approvals.reject"), mutates: true, testid: "approvals-drawer-reject", onClick: () => askReject([drawerRow.value.id]) },
  { key: "approve", role: "primary", label: t("leads.approvals.approve"), mutates: true, testid: "approvals-drawer-approve", onClick: () => askApprove([drawerRow.value.id]) },
]);
const rejectTitle = computed(() => {
  const count = rejecting.ids.length;
  return t(`leads.approvals.reject_title_${pluralKey(count)}`, { count });
});
const approveTitle = computed(() => {
  const count = approving.ids.length;
  return t(`leads.approvals.approve_title_${pluralKey(count)}`, { count });
});
const rejectActions = computed(() => [
  { key: "cancel", role: "secondary", label: t("common.cancel"), onClick: () => (rejecting.open = false) },
  { key: "submit", role: "danger", label: t("leads.approvals.reject"), testid: "approvals-reject-submit", onClick: submitReject },
]);

function query() {
  const params = { page: page.value, page_size: PAGE_SIZE, search: search.value || undefined };
  for (const [key, value] of Object.entries(filters)) if (value !== null) params[key] = value;
  return params;
}

let latest = 0; // only the newest answer lands (typing fires overlapping requests)

async function load() {
  const request = ++latest;
  loading.value = true;
  error.value = "";
  try {
    const { data } = await GET_Approvals(query());
    if (request !== latest) return;
    list.value = data;
    templates.value = new Set([...templates.value, ...rows.value.map((row) => row.template_key).filter(Boolean)]);
  } catch (err) {
    if (request === latest) error.value = extractApiMessage(err, t("leads.approvals.load_error"));
  } finally {
    if (request === latest) loading.value = false;
    first.value = false;
  }
}

function reload() {
  page.value = 1;
  clearSelection();
  return load();
}

function open(row) {
  if (row.channel === activeChannel) router.push({ name: "LeadsReview", params: { id: row.id }, query: { from: FROM_APPROVALS } });
  else drawerRow.value = row;
}

function clearSelection() {
  table.value?.clearSelection();
  selected.value = [];
}

function onBulk(key) {
  if (key === "approve") return askApprove(selection.value);
  askReject(selection.value);
}

function askApprove(ids) {
  Object.assign(approving, { open: true, ids });
}

function submitApprove() {
  approving.open = false;
  return run("approve", approving.ids);
}

function askReject(ids) {
  Object.assign(rejecting, { open: true, ids, reason: "", error: "" });
}

function submitReject() {
  if (!rejecting.reason.trim()) {
    rejecting.error = t("common.required");
    return;
  }
  rejecting.open = false;
  return run("reject", rejecting.ids, rejecting.reason.trim());
}

// Chunks of 100 ids; a chunk that fails as a whole marks each of its ids with the API message.
async function sendChunks(action, ids, reason) {
  const result = { done: [], failed: {} };
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    try {
      const { data } = await POST_ApprovalsBulk({ action, ids: chunk, reason });
      result.done.push(...data.done);
      Object.assign(result.failed, data.failed);
    } catch (err) {
      const why = extractApiMessage(err, t("leads.common.error"));
      chunk.forEach((id) => (result.failed[id] = why));
    }
  }
  return result;
}

// Says only what happened: the failures join the message when there are any.
function resultMessage(action, done, failedCount) {
  const verb = action === "approve" ? "approved" : "rejected";
  const doneText = t(`leads.approvals.${verb}_n_${pluralKey(done)}`, { count: done });
  if (!failedCount) return doneText;
  return `${doneText} ${t(`leads.approvals.not_${verb}`, { count: failedCount })}`;
}

async function run(action, ids, reason = "") {
  const { done, failed: refused } = await sendChunks(action, ids, reason);
  const count = Object.keys(refused).length;
  notify.spawnNotification({ msg: resultMessage(action, done.length, count), type: count ? "warning" : "positive" });
  failed.value = refused;
  drawerRow.value = null;
  await load();
  approvalsStore.refresh();
  // the refused rows stay selected (the table stays mounted and keeps their keys); the done ones left the list. With
  // nothing refused no tick stays behind without its selection bar (n6).
  selected.value = Object.keys(refused).map(Number);
  if (!selected.value.length) clearSelection();
}

async function openLog() {
  logOpen.value = true;
  logLoading.value = true;
  try {
    const { data } = await GET_ApprovalsLog();
    logRows.value = (data.results || []).map((entry) => ({
      ...entry,
      when: formatDate(entry.created_at),
      action: t(`leads.approvals.${entry.action}`),
      count: entry.done.length,
    }));
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.approvals.load_error")), type: "negative" });
  } finally {
    logLoading.value = false;
  }
}

watch(filters, reload);
onMounted(() => {
  load();
  if (!pimChannels.channels.length) pimChannels.fetchChannels();
});
</script>

<style scoped>
.approvals__preview {
  white-space: pre-wrap;
  color: var(--text-secondary);
}
</style>
