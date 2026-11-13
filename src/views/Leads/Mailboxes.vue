<template>
  <PageLayout data-testid="leads-mailboxes">
    <template #header>
      <PageHeader :title="$t('leads.mailboxes.title')" :back="{ name: 'LeadsSettings' }">
        <template #actions>
          <ActionBar :actions="actions" />
        </template>
      </PageHeader>
    </template>
    <Loader v-if="loading" block />
    <p v-else-if="error" class="t-negative m-0" role="alert" data-testid="mailbox-error">{{ error }}</p>
    <EmptyState v-else-if="!rows.length" icon="empty" size="md" :title="$t('leads.mailboxes.empty')" data-testid="mailboxes-empty" />
    <DataTable
      v-else
      :columns="columns"
      :rows="rows"
      row-key="id"
      :row-attrs="rowAttrs"
      data-testid="mailboxes-table"
      @row-click="edit"
    >
      <template #cell-address="{ row }">
        <span class="mailboxes__address flex-column">
          <span class="flex ai-ct flex-wrap gap-2">
            {{ row.address }}
            <StatusBadge v-if="row.is_default" tone="neutral" size="sm" :dot="false" :label="$t('leads.mailboxes.default')" />
          </span>
          <span v-if="row.display_name" class="t-muted fs-200">{{ row.display_name }}</span>
        </span>
      </template>
      <template #cell-state="{ row }">
        <StatusBadge :tone="MAILBOX_TONES[row.stateKey]" :label="mailboxStateLabel(row.stateKey)" :title="row.pause_reason" data-testid="mailbox-state" />
      </template>
      <template #cell-today="{ row }"><span data-testid="mailbox-today">{{ row.today }}</span></template>
      <template #cell-actions="{ row }">
        <BasicButton
          mutates
          size="sm"
          :data-testid="row.paused_at ? 'mailbox-resume' : 'mailbox-pause'"
          @click="reasonFor = row"
        >
          {{ $t(row.paused_at ? "leads.mailboxes.resume" : "leads.mailboxes.pause") }}
        </BasicButton>
      </template>
    </DataTable>
    <MailboxReasonDialog :mailbox="reasonFor" @close="reasonFor = null" @done="load" />
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_Health, GET_Mailboxes } from "@/api/communicator/api";
import { GET_AssignableUsers } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { mailboxStateLabel } from "@/utils/leadsLabels";
import { MAILBOX_TONES, mailboxState, sentToday } from "@/utils/leadsOutbound";
import MailboxReasonDialog from "./MailboxReasonDialog.vue";

// Settings → Mailboxes: the addresses mail leaves from, with today's count against today's cap (from the health
// report) and Pause / Resume (a reason each). A row opens the mailbox form.
const router = useRouter();
const loading = ref(true);
const error = ref("");
const mailboxes = ref([]);
const health = ref({});
const users = ref({});
const reasonFor = ref(null);

const columns = [
  { key: "address", label: t("leads.mailboxes.col_address"), width: "1fr" },
  { key: "user", label: t("leads.mailboxes.col_user"), width: "max-content", priority: 2 },
  { key: "state", label: t("leads.mailboxes.col_state"), width: "max-content" },
  { key: "today", label: t("leads.mailboxes.col_today"), numeric: true, priority: 2 },
  { key: "actions", label: "", actions: true },
];
const actions = [
  { key: "add", role: "primary", label: t("leads.mailboxes.add"), testid: "mailboxes-add", onClick: () => edit({ id: "new" }) },
];

const todayOf = (row) => (row ? sentToday(row.sent_today, row.cap_today) : "—");
const rows = computed(() =>
  mailboxes.value.map((mailbox) => ({
    ...mailbox,
    stateKey: mailboxState(mailbox, health.value[mailbox.id]?.cap_today ?? null),
    user: users.value[mailbox.user_id] || (mailbox.user_id ? `#${mailbox.user_id}` : ""),
    today: todayOf(health.value[mailbox.id]),
  }))
);
const rowAttrs = (row) => ({ "data-testid": "mailbox-row", "data-mailbox": row.id });

const edit = (row) => router.push({ name: "LeadsMailboxEdit", params: { id: row.id } });

// The health report and the user names only add to the list: without them it still shows.
async function loadExtras() {
  const [report, people] = await Promise.allSettled([GET_Health(), GET_AssignableUsers()]);
  if (report.status === "fulfilled") health.value = Object.fromEntries(report.value.data.mailboxes.map((row) => [row.id, row]));
  if (people.status === "fulfilled") users.value = Object.fromEntries(people.value.map((user) => [user.id, user.name || user.username]));
}

async function load() {
  error.value = "";
  try {
    mailboxes.value = (await GET_Mailboxes()).data.results || [];
    await loadExtras();
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.mailboxes.load_error"));
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
/* An address breaks anywhere on a phone: the row keeps its Pause / Resume in sight, the table never scrolls sideways */
.mailboxes__address {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
