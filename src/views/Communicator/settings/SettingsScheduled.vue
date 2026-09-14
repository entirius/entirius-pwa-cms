<template>
  <section class="ld-field" data-testid="settings-scheduled">
    <h3>{{ $t("communicator.scheduled.title") }}</h3>
    <p class="ld-muted">{{ $t("communicator.scheduled.note") }}</p>
    <p v-if="!rows.length" class="ld-muted">{{ $t("communicator.scheduled.empty") }}</p>
    <table v-else class="ld-table">
      <thead>
        <tr>
          <th>{{ $t("communicator.template.subject") }}</th>
          <th>{{ $t("communicator.scheduled.status") }}</th>
          <th>{{ $t("communicator.scheduled.at") }}</th>
          <th>{{ $t("communicator.scheduled.next_slot") }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" :data-message="row.id" data-testid="scheduled-row">
          <td>{{ row.subject }}</td>
          <td>{{ row.status }}</td>
          <td>{{ formatDate(row.scheduled_at) }}</td>
          <td>{{ formatDate(row.next_slot) }}</td>
          <td>
            <span v-if="queued.has(row.id)" class="ld-badge" data-testid="scheduled-next-beat">{{ $t("communicator.scheduled.next_beat") }}</span>
            <button v-else class="ld-btn" data-testid="scheduled-send-now" @click="sendNow(row)">
              {{ $t("communicator.scheduled.send_now") }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="error" class="ld-error">{{ error }}</p>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_Messages, POST_SendNow } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";

// Waiting messages (approved + scheduled). C-31: Send now only moves scheduled_at; the next beat sends.
const WAITING = ["approved", "scheduled"];
const rows = ref([]);
const queued = reactive(new Set());
const error = ref("");
const formatDate = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

async function load() {
  const pages = await Promise.all(WAITING.map((status) => GET_Messages({ status })));
  rows.value = pages.flatMap((page) => page.data.results);
}

async function sendNow(row) {
  error.value = "";
  try {
    row.scheduled_at = (await POST_SendNow(row.id)).data.scheduled_at;
    queued.add(row.id);
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
  }
}

onMounted(load);
</script>
