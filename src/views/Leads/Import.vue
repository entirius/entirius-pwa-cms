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
      <BasicCard :title="$t('leads.import.columns_title')" gap data-testid="import-columns">
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
          accept=".csv,text/csv"
          tabindex="-1"
          data-testid="import-file"
          @change="pick"
        />
        <BasicButton data-testid="import-choose" @click="fileInput.click()">{{ $t("leads.import.choose") }}</BasicButton>
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
          <p v-if="batch.ignored_columns?.length" class="m-0" data-testid="import-ignored">
            {{ $t("leads.import.ignored", { list: batch.ignored_columns.join(", ") }) }}
          </p>
          <p v-if="batch.automation_started_count !== undefined && sentRunRules" class="m-0" data-testid="import-automation">
            {{ $t("leads.import.automation_started", { count: batch.automation_started_count }) }}
          </p>
          <ul v-if="rowReasons.length" class="import__list" data-testid="import-rows">
            <li v-for="entry in rowReasons" :key="`${entry.row}-${entry.reason}`">
              {{ entry.row ? $t("leads.import.row", { row: entry.row }) : $t("leads.import.file") }}: {{ importReasonLabel(entry.reason) }}
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
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_AssignableUsers, GET_Attributes, GET_Import, POST_Import } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useAccessStore } from "@/stores/access";
import { useMuninStore } from "@/stores/munin";
import { importReasonLabel, importStatusLabel } from "@/utils/leadsLabels";
import { outboundOn } from "@/utils/leadsOutbound";

// CSV upload: the batch runs on the leads queue; the screen polls it until done or failed.
const POLL_MS = 2000;
const outbound = computed(() => outboundOn(useMuninStore(), "leads"));
const runRules = ref(false);
const sentRunRules = ref(false);
const ownerId = ref(useAccessStore().me?.user?.id ?? null);
const owners = ref([]);
const customColumns = ref([]);
const COLUMN_KEYS = ["column_company", "column_domain", "column_contact", "column_legal_basis"];
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
let timer = null;
// Ignored columns are one sentence above; an older backend also lists them as rows (`ignored_column:<name>`).
const rowReasons = computed(() => (batch.value?.report || []).filter((entry) => !String(entry.reason).startsWith("ignored_column:")));

// R5: the secondary ways in, then Upload — the one primary — rightmost.
const actions = computed(() => [
  { key: "sample", label: t("leads.import.sample"), role: "secondary", testid: "import-sample", onClick: downloadSample },
  {
    key: "one",
    label: t("leads.add.one"),
    role: "secondary",
    testid: "import-add-one",
    onClick: () => router.push({ name: "LeadsCompanyNew" }),
  },
  {
    key: "upload",
    label: t("leads.import.upload"),
    role: "primary",
    testid: "import-upload",
    disabled: !file.value || busy.value,
    onClick: upload,
  },
]);

function pick(event) {
  file.value = event.target.files?.[0] || null;
}

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
  error.value = extractApiMessage(err, t("leads.import.failed"));
}

// Every poll handles its own failure: a later poll runs from the timer, outside upload()'s try.
async function poll() {
  try {
    batch.value = (await GET_Import(batch.value.id)).data;
  } catch (err) {
    return fail(err);
  }
  if (FINISHED.includes(batch.value.status)) busy.value = false;
  else timer = setTimeout(poll, POLL_MS);
}

async function upload() {
  error.value = "";
  busy.value = true;
  try {
    sentRunRules.value = outbound.value && runRules.value;
    const extras = outbound.value ? [runRules.value, ownerId.value] : [];
    batch.value = (await POST_Import(file.value, ...extras)).data;
  } catch (err) {
    return fail(err);
  }
  await poll();
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
onBeforeUnmount(() => clearTimeout(timer));
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
