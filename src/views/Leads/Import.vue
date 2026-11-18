<template>
  <PageLayout data-testid="leads-import">
    <template #header>
      <PageHeader :title="$t('leads.import.title')">
        <template #actions>
          <ActionBar :actions="actions" />
        </template>
      </PageHeader>
    </template>
    <div class="import flex-column gap-8">
      <p class="m-0">{{ $t("leads.import.hint") }}</p>
      <BasicCard v-if="!preview" :title="$t('leads.import.columns_title')" gap data-testid="import-columns">
        <ul class="import__list">
          <li v-for="key in COLUMN_KEYS" :key="key">{{ $t(`leads.import.${key}`) }}</li>
          <li v-for="column in customColumns" :key="column.column" data-testid="import-custom-column">
            {{ $t("leads.import.column_attr", column) }}
          </li>
        </ul>
      </BasicCard>
      <BasicCard :title="$t('leads.import.after_title')" gap data-testid="import-after">
        <p class="m-0">{{ $t(outbound ? "leads.import.after_rules" : "leads.import.after") }}</p>
      </BasicCard>
      <div class="flex ai-ct flex-wrap gap-5">
        <!-- the native picker stays scriptable (a page object sets its files); the button opens it -->
        <input
          ref="fileInput"
          class="visually-hidden"
          type="file"
          :accept="ACCEPT"
          tabindex="-1"
          :disabled="sending"
          data-testid="import-file"
          @change="pick"
        />
        <BasicButton data-testid="import-choose" :disabled="sending" @click="fileInput.click()">{{ $t("leads.import.choose") }}</BasicButton>
        <span data-testid="import-file-name">{{ file?.name || $t("leads.import.no_file") }}</span>
      </div>
      <!-- leads >= 0.5.0: the owner of the new companies (me by default); the automation starts on them only when
           asked, the cost note stays visible -->
      <FormField v-if="outbound" class="import__owner" :label="$t('leads.import.owner')" :hint="$t('leads.import.owner_hint')">
        <BasicSelect v-model="ownerId" :options="owners" :placeholder="$t('leads.import.no_owner')" searchable clearable data-testid="import-owner" />
      </FormField>
      <div v-if="outbound" class="flex-column gap-2">
        <BasicCheckbox v-model="runRules" aria-describedby="import-run-rules-note" data-testid="import-run-rules">
          {{ $t("leads.import.run_rules") }}
        </BasicCheckbox>
        <p id="import-run-rules-note" class="t-secondary m-0" data-testid="import-run-rules-note">{{ $t("leads.import.run_rules_note") }}</p>
      </div>
      <ImportMapping v-if="preview && !batch" v-model="mapping" :preview="preview" :fields="preview.fields || []" />
      <p v-if="error" class="t-negative m-0" data-testid="import-error">{{ error }}</p>
      <BasicCard v-if="batch" data-testid="import-report">
        <div class="flex-column gap-3">
          <p class="flex ai-ct gap-2 m-0">
            {{ $t("leads.import.status") }}:
            <StatusBadge :tone="STATUS_TONES[batch.status]" :label="importStatusLabel(batch.status)" data-testid="import-status" />
          </p>
          <p class="m-0" data-testid="import-counts">
            {{ $t("leads.import.counts", { created: batch.created_count, matched: batch.matched_count, skipped: batch.skipped_count }) }}
          </p>
          <p v-if="batch.ignored_columns?.length && !went.length" class="m-0" data-testid="import-ignored">
            {{ $t("leads.import.ignored", { list: batch.ignored_columns.join(", ") }) }}
          </p>
          <p v-if="batch.automation_started_count !== undefined && sentRunRules" class="m-0" data-testid="import-automation">
            {{ $t("leads.import.automation_started", { count: batch.automation_started_count }) }}
          </p>
          <div v-if="went.length" class="flex-column gap-2" data-testid="import-went">
            <p class="m-0 t-strong">{{ $t("leads.import.mapping.result_title") }}</p>
            <ul class="import__list">
              <li v-for="line in went" :key="line">{{ line }}</li>
            </ul>
          </div>
          <ul v-if="rowReasons.length" class="import__list" data-testid="import-rows">
            <li v-for="entry in rowReasons" :key="`${entry.row}-${entry.reason}`">
              {{ entry.row ? $t("leads.import.row", { row: entry.row }) : $t("leads.import.file") }}: {{ importReasonLabel(entry.reason, reasonName) }}
            </li>
          </ul>
          <router-link
            v-if="batch.status === 'done'"
            class="t-accent"
            :to="{ name: 'LeadsCompanies' }"
            data-testid="import-to-board"
          >
            {{ $t("leads.import.to_board") }}
          </router-link>
        </div>
      </BasicCard>
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_AssignableUsers, GET_Attributes, GET_Import, POST_Import, POST_ImportPreview } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useAccessStore } from "@/stores/access";
import { useMuninStore } from "@/stores/munin";
import { importReasonLabel, importStatusLabel } from "@/utils/leadsLabels";
import { outboundOn } from "@/utils/leadsOutbound";
import ImportMapping from "./ImportMapping.vue";
import { conflicts, errorStatus, hasIdentity, nameConflict, importErrorText, reasonFieldName, mappingPayload, proposedMapping, wentLines } from "./columnMapping";

// U17: the file (.csv or .xlsx) is read first — the server proposes a field for every column, the user checks and
// corrects it — and only then imported with the approved mapping. The batch runs on the leads queue; the screen polls
// it until done or failed. A backend without the preview (404 / 405) imports the file straight away, as before.
const ACCEPT = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const NO_PREVIEW = [404, 405];
// The rows under a changed mapping come from the server (it splits a full name, checks e-mails), a moment after the
// last change; a reply that a later change overtook is dropped.
const REFRESH_MS = 400;
const POLL_MS = 2000;
const outbound = computed(() => outboundOn(useMuninStore(), "leads"));
const runRules = ref(false);
const sentRunRules = ref(false);
const ownerId = ref(useAccessStore().me?.user?.id ?? null);
const owners = ref([]);
const customColumns = ref([]);
const COLUMN_KEYS = ["column_company", "column_domain", "column_contact", "column_legal_basis", "column_brand"];
const ATTRIBUTE_PREFIXES = [
  ["company", "attr."],
  ["contact", "contact.attr."],
];
const SAMPLE_NAME = "leads-sample.csv";
const SAMPLE_CSV = [
  "company_name,domain,first_name,last_name,email,legal_basis",
  "Example Shop,example-shop.test,Jan,Kowalski,jan@example-shop.test,legitimate_interest",
  "Another Shop,another-shop.test,Anna,Nowak,anna@another-shop.test,consent",
  "",
].join("\n");
const FINISHED = ["done", "failed"];
const STATUS_TONES = { pending: "neutral", running: "info", done: "positive", failed: "negative" };
const router = useRouter();
const fileInput = ref(null);
const file = ref(null);
const batch = ref(null);
const busy = ref(false);
const error = ref("");
const preview = ref(null);
const mapping = ref({});
const sentMapping = ref(null);
let timer = null;
let refreshTimer = null;
let refreshSeq = 0;
// One number per file: picking another file (reset) moves it on, and an answer for the old file is dropped.
let runId = 0;
const clashing = (current) => Object.keys(conflicts(current)).length > 0 || nameConflict(current).length > 0;
const mappingReady = computed(() => !clashing(mapping.value) && hasIdentity(mapping.value));
// Where each column went: the batch says it (`column_mapping`), else the mapping this screen sent.
const applied = computed(() =>
  batch.value?.column_mapping?.length ? batch.value.column_mapping : Object.entries(sentMapping.value || {}).map(([column, field]) => ({ column, field }))
);
const went = computed(() => (preview.value && batch.value ? wentLines(applied.value, preview.value.fields || []) : []));
// Ignored columns are one sentence above; an older backend also lists them as rows (`ignored_column:<name>`).
const reasonName = (key) => reasonFieldName(key, preview.value?.fields, applied.value);
const rowReasons = computed(() => (batch.value?.report || []).filter((entry) => !String(entry.reason).startsWith("ignored_column:")));

// R5: the secondary ways in, then the one primary rightmost: Check the columns, then Import once they are checked.
const actions = computed(() =>
  [
    { key: "sample", label: t("leads.import.sample"), role: "secondary", testid: "import-sample", onClick: downloadSample },
    {
      key: "one",
      label: t("leads.add.one"),
      role: "secondary",
      testid: "import-add-one",
      onClick: () => router.push({ name: "LeadsCompanyNew" }),
    },
    preview.value && !batch.value
      ? { key: "other", label: t("leads.import.mapping.other_file"), role: "secondary", mutates: false, testid: "import-other-file", disabled: sending.value, onClick: chooseAgain }
      : null,
    preview.value
      ? {
          key: "upload",
          label: t("leads.import.mapping.import"),
          role: "primary",
          testid: "import-upload",
          disabled: busy.value || Boolean(batch.value) || !mappingReady.value,
          onClick: upload,
        }
      : { key: "check", label: t("leads.import.mapping.check"), role: "primary", testid: "import-check", disabled: !file.value || busy.value, onClick: check },
  ].filter(Boolean)
);

function reset() {
  clearTimeout(timer);
  clearTimeout(refreshTimer);
  refreshSeq += 1;
  runId += 1;
  busy.value = false;
  preview.value = null;
  mapping.value = {};
  sentMapping.value = null;
  batch.value = null;
  error.value = "";
}

function pick(event) {
  reset();
  file.value = event.target.files?.[0] || null;
}

function chooseAgain() {
  reset();
  file.value = null;
  if (fileInput.value) fileInput.value.value = "";
  fileInput.value?.click();
}

const errorText = (err, fallbackKey) => importErrorText(err, t(fallbackKey)) || extractApiMessage(err, t(fallbackKey));

async function check() {
  const run = runId;
  error.value = "";
  busy.value = true;
  try {
    const { data } = await POST_ImportPreview(file.value);
    if (run !== runId) return;
    preview.value = { ...data, columns: data.columns || [], rows: data.rows || [] };
    mapping.value = proposedMapping(preview.value.columns);
  } catch (err) {
    if (run !== runId) return;
    if (NO_PREVIEW.includes(errorStatus(err))) return upload();
    error.value = errorText(err, "leads.import.mapping.failed");
  }
  busy.value = false;
}

// A changed mapping: the five rows again, under the user's mapping (not while two columns share a field — the user
// is mid-change, and the server would settle the clash its own way).
async function refresh() {
  const seq = ++refreshSeq;
  try {
    const { data } = await POST_ImportPreview(file.value, mappingPayload(preview.value.columns, mapping.value));
    if (seq !== refreshSeq || !preview.value) return;
    preview.value = { ...preview.value, rows: data.rows || [] };
    error.value = "";
  } catch (err) {
    if (seq === refreshSeq) error.value = errorText(err, "leads.import.mapping.failed");
  }
}

watch(mapping, (next, previous) => {
  if (!preview.value || !Object.keys(previous || {}).length) return;
  clearTimeout(refreshTimer);
  if (clashing(next)) return;
  refreshTimer = setTimeout(refresh, REFRESH_MS);
});

function downloadSample() {
  const url = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv" }));
  const link = document.createElement("a");
  Object.assign(link, { href: url, download: SAMPLE_NAME });
  link.click();
  URL.revokeObjectURL(url);
}

function fail(err) {
  clearTimeout(timer);
  busy.value = false;
  error.value = errorText(err, "leads.import.failed");
}

// Every poll handles its own failure: a later poll runs from the timer, outside upload()'s try.
async function poll(run) {
  let data;
  try {
    data = (await GET_Import(batch.value.id)).data;
  } catch (err) {
    return run === runId ? fail(err) : undefined;
  }
  if (run !== runId) return;
  batch.value = data;
  if (FINISHED.includes(data.status)) busy.value = false;
  else timer = setTimeout(() => poll(run), POLL_MS);
}

// The import is on its way to the server: another file now would drop the answer of one that runs anyway.
const sending = ref(false);

async function upload() {
  const run = runId;
  clearTimeout(refreshTimer);
  refreshSeq += 1; // a preview still on its way must not clear this import's error
  error.value = "";
  busy.value = true;
  sending.value = true;
  try {
    sentRunRules.value = outbound.value && runRules.value;
    const extras = outbound.value ? [runRules.value, ownerId.value] : [];
    const sent = preview.value ? mappingPayload(preview.value.columns, mapping.value) : null;
    const { data } = sent ? await POST_Import(file.value, extras[0], extras[1], sent) : await POST_Import(file.value, ...extras);
    sending.value = false;
    if (run !== runId) return;
    sentMapping.value = sent;
    batch.value = data;
  } catch (err) {
    sending.value = false;
    return run === runId ? fail(err) : undefined;
  }
  await poll(run);
}

// The custom-field columns a file may carry: `attr.<key>` for a company field, `contact.attr.<key>` for a contact one.
async function loadColumns() {
  const lists = await Promise.all(
    ATTRIBUTE_PREFIXES.map(([entity, prefix]) =>
      GET_Attributes(entity).then(({ data }) => (data.results || []).filter((field) => field.is_active !== false).map((field) => customColumn(prefix, field)))
    )
  );
  customColumns.value = lists.flat();
}

const customColumn = (prefix, field) => ({ column: `${prefix}${field.key}`, label: field.label, kind: t(`leads.field_kind.${field.kind}`) });

// Me by default only when I can own companies: otherwise the select would show nothing while an id is sent.
async function loadOwners() {
  owners.value = (await GET_AssignableUsers()).map((user) => ({ value: user.id, label: user.name || user.username }));
  if (!owners.value.some((owner) => owner.value === ownerId.value)) ownerId.value = null;
}

onMounted(() => {
  if (!outbound.value) return;
  loadColumns().catch(() => (customColumns.value = []));
  loadOwners().catch(() => {
    owners.value = [];
    ownerId.value = null;
  });
});
onBeforeUnmount(() => {
  clearTimeout(timer);
  clearTimeout(refreshTimer);
});
</script>

<style scoped>
.import__owner {
  max-width: 24rem;
}
.import__list {
  margin: 0;
  padding-left: var(--space-4);
}
</style>
