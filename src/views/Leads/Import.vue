<template>
  <div class="ld-page" data-testid="leads-import">
    <h2 class="ld-title">{{ $t("leads.import.title") }}</h2>
    <p class="ld-muted">{{ $t("leads.import.hint") }}</p>
    <div class="ld-row">
      <input ref="fileInput" type="file" accept=".csv,text/csv" data-testid="import-file" @change="pick" />
      <button class="ld-btn ld-btn--primary" :disabled="!file || busy" data-testid="import-upload" @click="upload">
        {{ $t("leads.import.upload") }}
      </button>
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
const FINISHED = ["done", "failed"];
const file = ref(null);
const batch = ref(null);
const busy = ref(false);
const error = ref("");
let timer = null;

function pick(event) {
  file.value = event.target.files?.[0] || null;
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
