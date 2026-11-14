<template>
  <PageLayout data-testid="leads-do-not-contact">
    <template #header>
      <PageHeader :title="$t('leads.dnc.title')" :back="{ name: 'LeadsSettings' }">
        <template #actions>
          <ActionBar :actions="actions" />
        </template>
      </PageHeader>
    </template>
    <template #toolbar>
      <div class="flex ai-ct flex-wrap gap-5">
        <BasicInput v-model="search" icon="search" :placeholder="$t('leads.dnc.search')" data-testid="dnc-search" @input="debouncedFetch(reload)" />
        <MobileFilterPanel :active-count="activeFilters" :trigger-label="$t('leads.dnc.filters')">
          <BasicSelect v-model="filters.scope" :floating-label="$t('leads.dnc.reach')" clearable :options="scopeOptions" data-testid="dnc-reach" />
          <BasicSelect v-model="filters.source" :floating-label="$t('leads.dnc.why')" clearable :options="sourceOptions" data-testid="dnc-why" />
        </MobileFilterPanel>
      </div>
    </template>

    <Loader v-if="loading" block />
    <p v-else-if="error" class="t-negative m-0" role="alert" data-testid="dnc-error">{{ error }}</p>
    <EmptyState v-else-if="!rows.length && !filtered" icon="empty" size="md" :title="$t('leads.dnc.empty')" data-testid="dnc-empty" />
    <DataTable
      v-else
      :columns="columns"
      :rows="pageRows"
      row-key="id"
      :row-attrs="rowAttrs"
      :empty-text="$t('leads.dnc.none_match')"
      data-testid="settings-suppressions"
    >
      <template #cell-scope="{ row }"><StatusBadge tone="neutral" :dot="false" :label="reachLabel(row.scope)" /></template>
      <template #cell-source="{ row }"><StatusBadge tone="neutral" :dot="false" :label="dncSourceLabel(row.source)" /></template>
      <template #cell-actions="{ row }">
        <IconButton
          v-if="row.kind !== 'email_token'"
          mutates
          icon="delete"
          variant="danger"
          size="sm"
          :label="$t('leads.dnc.remove')"
          data-testid="dnc-delete"
          @click="removing = row"
        />
      </template>
    </DataTable>
    <template #footer>
      <Pagination v-model:page="page" :pages="Math.ceil(rows.length / PAGE_SIZE)" />
    </template>

    <BasicModal v-model:open="adding" :title="$t('leads.dnc.add')" size="sm" :actions="addActions" data-testid="dnc-add-modal">
      <div class="flex-column gap-4">
        <FormField :label="$t('communicator.suppressions.kind')">
          <BasicRadioGroup v-model="draft.kind" :options="kindOptions" data-testid="suppression-kind" />
        </FormField>
        <FormField :label="$t('leads.dnc.value')" required :error="valueError">
          <BasicInput v-model="draft.value" :format="draft.kind === 'email' ? 'email' : undefined" :maxlength="254" data-testid="suppression-value" />
        </FormField>
        <FormField v-if="scopeOffered" :label="$t('leads.dnc.reach')" :error="reachError">
          <BasicRadioGroup v-model="draft.scope" :options="scopeOptions" name="dnc-add-reach" data-testid="dnc-add-reach" />
        </FormField>
        <FormField :label="$t('leads.dnc.note')">
          <BasicInput v-model="draft.reason" :maxlength="255" data-testid="suppression-reason" />
        </FormField>
        <p class="m-0 t-secondary">{{ $t("leads.dnc.add_note") }}</p>
      </div>
    </BasicModal>

    <BasicModal v-model:open="checking" :title="$t('leads.dnc.check')" size="sm" :actions="checkActions" data-testid="dnc-check-modal">
      <div class="flex-column gap-4">
        <FormField :label="$t('leads.dnc.kind.email')" required :error="checkError">
          <BasicInput v-model="checkEmail" format="email" :maxlength="254" data-testid="dnc-check-email" />
        </FormField>
        <ul v-if="checkLines.length" class="dnc__result m-0" data-testid="dnc-check-result">
          <li v-for="line in checkLines" :key="line">{{ line }}</li>
        </ul>
      </div>
    </BasicModal>

    <ConfirmDialog
      :open="Boolean(removing)"
      :title="$t('leads.dnc.remove')"
      :message="$t('leads.dnc.remove_confirm', { value: removing?.value })"
      :confirm-label="$t('leads.dnc.remove')"
      :cancel-label="$t('leads.common.keep')"
      tone="danger"
      confirm-testid="dnc-delete-confirm"
      @confirm="remove"
      @cancel="removing = null"
    />
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { t } from "@/i18n";
import { DELETE_Suppression, GET_AddressStatus, GET_Suppressions, POST_Suppression } from "@/api/communicator/api";
import { apiFieldErrors, giveText } from "@/utils/leadsForm";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { useNotifyStore } from "@/stores/notify";
import { formatDay } from "@/utils/format";
import { addressStatusLabel, dncKindLabel, dncSourceLabel } from "@/utils/leadsLabels";

// The one list of addresses and domains the channel never mails: who put them there (source), whether a row covers
// this channel or all channels (scope). Add, remove, and check why one address gets no mail. Erased addresses (a
// hashed token) are listed but never removed. The API answers the whole filtered list: it is paged here.
const PAGE_SIZE = 50;
const SOURCES = ["manual", "optout_confirmed", "unsubscribe_link", "bounce", "complaint", "erased"];

const notify = useNotifyStore();
const { search, debouncedFetch } = useSearchDebounce();
const filters = reactive({ scope: null, source: null });
const list = ref([]);
const loading = ref(true);
const error = ref("");
const page = ref(1);
const adding = ref(false);
const draft = reactive({ kind: "email", value: "", reason: "", scope: "channel" });
// The reach of a new row (`scope`): an older backend refuses the field. Refused with This channel (what an older
// backend does anyway) the entry goes again without it and the choice is not offered any more; refused with All
// channels the error stands on Reach — never a narrower entry than the one asked for.
const scopeOffered = ref(true);
const valueError = ref("");
const reachError = ref("");
const checking = ref(false);
const checkEmail = ref("");
const checkError = ref("");
const checkLines = ref([]);
const removing = ref(null);

const scopeOptions = [
  { value: "channel", label: t("leads.dnc.reach_channel") },
  { value: "install", label: t("leads.dnc.reach_all") },
];
const sourceOptions = SOURCES.map((value) => ({ value, label: dncSourceLabel(value) }));
const kindOptions = ["email", "domain"].map((value) => ({ value, label: dncKindLabel(value) }));
const columns = [
  { key: "value", label: t("leads.dnc.value"), width: "1fr" },
  { key: "kindText", label: t("communicator.suppressions.kind"), width: "max-content", priority: 3 },
  { key: "scope", label: t("leads.dnc.reach"), width: "max-content", priority: 2 },
  { key: "source", label: t("leads.dnc.why"), width: "max-content" },
  { key: "reason", label: t("leads.dnc.note"), width: "160px", priority: 3 },
  { key: "added", label: t("leads.dnc.added"), width: "max-content", priority: 3 },
  { key: "actions", label: "", actions: true },
];
const actions = [
  { key: "check", role: "secondary", label: t("leads.dnc.check"), mutates: false, testid: "dnc-check", onClick: openCheck },
  { key: "add", role: "primary", label: t("leads.dnc.add"), testid: "suppression-add", onClick: openAdd },
];
const addActions = computed(() => [
  { key: "cancel", role: "secondary", label: t("common.cancel"), onClick: () => (adding.value = false) },
  { key: "submit", role: "primary", label: t("leads.dnc.add"), testid: "dnc-add-submit", onClick: add },
]);
const checkActions = computed(() => [
  { key: "close", role: "secondary", label: t("common.close"), onClick: () => (checking.value = false) },
  { key: "submit", role: "primary", label: t("leads.dnc.check"), mutates: false, testid: "dnc-check-submit", onClick: check },
]);

const rows = computed(() =>
  list.value.map((row) => ({ ...row, kindText: dncKindLabel(row.kind), added: formatDay(row.created_at) }))
);
const pageRows = computed(() => rows.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));
const activeFilters = computed(() => Object.values(filters).filter((value) => value !== null).length);
const filtered = computed(() => activeFilters.value > 0 || Boolean(search.value));
const reachLabel = (scope) => t(scope === "install" ? "leads.dnc.reach_all" : "leads.dnc.reach_channel");
const rowAttrs = (row) => ({ "data-testid": "dnc-row", "data-suppression": row.id });

let latest = 0; // only the newest answer lands (typing fires overlapping requests)

async function load() {
  const request = ++latest;
  error.value = "";
  try {
    const params = { search: search.value || undefined, scope: filters.scope ?? undefined, source: filters.source ?? undefined };
    const { data } = await GET_Suppressions(params);
    if (request === latest) list.value = data.results || [];
  } catch (err) {
    if (request === latest) error.value = extractApiMessage(err, t("leads.dnc.load_error"));
  } finally {
    loading.value = false;
  }
}

function reload() {
  page.value = 1;
  return load();
}

function openAdd() {
  Object.assign(draft, { kind: "email", value: "", reason: "", scope: "channel" });
  valueError.value = "";
  reachError.value = "";
  adding.value = true;
}

// A refusal (400, 409 duplicate) names the value: the dialog stays open with the error on that field.
async function add() {
  if (!draft.value.trim()) return (valueError.value = giveText("value"));
  try {
    await postEntry();
    adding.value = false;
    await load();
  } catch (err) {
    // a field error in words (T7); a refusal of the whole entry (a duplicate) in the API's sentence
    const fields = apiFieldErrors(err, ["value", "scope"]);
    reachError.value = fields.scope || "";
    valueError.value = fields.value || (fields.scope ? "" : extractApiMessage(err, t("leads.dnc.load_error")));
  }
}

async function postEntry() {
  const { scope, ...entry } = { ...draft, value: draft.value.trim() };
  if (!scopeOffered.value) return POST_Suppression(entry);
  try {
    return await POST_Suppression({ ...entry, scope });
  } catch (err) {
    if (scope !== "channel" || !apiFieldErrors(err, ["scope"]).scope) throw err;
    scopeOffered.value = false;
    return POST_Suppression(entry);
  }
}

async function remove() {
  const row = removing.value;
  removing.value = null;
  try {
    await DELETE_Suppression(row.id);
    await load();
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.dnc.load_error")), type: "negative" });
  }
}

function openCheck() {
  checkEmail.value = "";
  checkError.value = "";
  checkLines.value = [];
  checking.value = true;
}

function explain(data) {
  const lines = data.suppressions.map((row) => t("leads.dnc.check_on_list", { why: dncSourceLabel(row.source), reach: reachLabel(row.scope) }));
  const status = data.address_status;
  if (status && status.status !== "unknown") {
    lines.push(t("leads.dnc.check_address", { status: addressStatusLabel(status.status), reason: status.reason }));
  }
  return data.refusal ? lines : [...lines, t("leads.dnc.check_clear")];
}

async function check() {
  checkError.value = "";
  if (!checkEmail.value.trim()) return (checkError.value = giveText("email"));
  try {
    checkLines.value = explain((await GET_AddressStatus(checkEmail.value.trim())).data);
  } catch (err) {
    checkError.value = apiFieldErrors(err, ["email"]).email || extractApiMessage(err, t("leads.dnc.load_error"));
  }
}

watch(filters, reload);
onMounted(load);
</script>

<style scoped>
.dnc__result {
  padding-left: var(--space-5);
}
</style>
