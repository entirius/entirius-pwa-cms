<template>
  <div class="ld-page" data-testid="leads-import">
    <p>{{ $t("leads.import.hint") }}</p>
    <section class="ld-field" data-testid="import-columns">
      <h3 class="import__head">{{ $t("leads.import.columns_title") }}</h3>
      <ul class="import__list">
        <li v-for="key in COLUMN_KEYS" :key="key">{{ $t(`leads.import.${key}`) }}</li>
      </ul>
    </section>
    <section class="ld-field" data-testid="import-after">
      <h3 class="import__head">{{ $t("leads.import.after_title") }}</h3>
      <p>{{ $t("leads.import.after") }}</p>
    </section>
    <div class="ld-row">
      <label class="ld-btn import__pick">
        {{ $t("leads.import.choose") }}
        <input
          ref="fileInput"
          class="import__input"
          type="file"
          accept=".csv,text/csv"
          data-testid="import-file"
          @change="pick"
        />
      </label>
      <span data-testid="import-file-name">{{ file?.name || $t("leads.import.no_file") }}</span>
      <button class="ld-btn ld-btn--primary" :disabled="!file || busy" data-testid="import-upload" @click="upload">
        {{ $t("leads.import.upload") }}
      </button>
      <button class="ld-btn" data-testid="import-sample" @click="downloadSample">{{ $t("leads.import.sample") }}</button>
      <router-link :to="{ name: 'LeadsCompanyNew' }" class="ld-btn import__one" data-testid="import-add-one">
        {{ $t("leads.add.one") }}
      </router-link>
    </div>
    <p v-if="error" class="ld-error" data-testid="import-error">{{ error }}</p>
    <section v-if="batch" class="ld-field" data-testid="import-report">
      <p>{{ $t("leads.import.status") }}: <strong data-testid="import-status">{{ batch.status }}</strong></p>
      <p data-testid="import-counts">
        {{ $t("leads.import.counts", { created: batch.created_count, matched: batch.matched_count, skipped: batch.skipped_count }) }}
      </p>
      <ul v-if="batch.report?.length">
        <li v-for="entry in batch.report" :key="`${entry.row}-${entry.reason}`">
          {{ $t("leads.import.row", { row: entry.row }) }}: {{ entry.reason }}
        </li>
      </ul>
      <router-link v-if="batch.status === 'done'" :to="{ name: 'LeadsBoard' }" data-testid="import-to-board">
        {{ $t("leads.import.to_board") }}
      </router-link>
    </section>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref } from "vue";
import { t } from "@/i18n";
import { GET_Import, POST_Import } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";

// CSV upload: the batch runs on the leads queue; the screen polls it until done or failed.
const POLL_MS = 2000;
const COLUMN_KEYS = ["column_company", "column_domain", "column_contact", "column_legal_basis"];
const SAMPLE_NAME = "leads-sample.csv";
const SAMPLE_CSV = [
  "company_name,domain,first_name,last_name,email,legal_basis",
  "Example Shop,example-shop.test,Jan,Kowalski,jan@example-shop.test,legitimate_interest",
  "Another Shop,another-shop.test,Anna,Nowak,anna@another-shop.test,consent",
  "",
].join("\n");
const FINISHED = ["done", "failed"];
const file = ref(null);
const batch = ref(null);
const busy = ref(false);
const error = ref("");
let timer = null;

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
    batch.value = (await POST_Import(file.value)).data;
  } catch (err) {
    return fail(err);
  }
  await poll();
}

onBeforeUnmount(() => clearTimeout(timer));
</script>

<style scoped>
.import__one {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.import__head {
  margin: 0;
  font-size: var(--fs-300);
}
.import__list {
  margin: 0;
  padding-left: 1.1rem;
}
/* The native file control stays focusable and scriptable; the label is what the user sees and clicks. */
.import__pick {
  position: relative;
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  cursor: pointer;
}
.import__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
