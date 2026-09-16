<template>
  <section class="ld-field" data-testid="settings-scheduled">
    <h3>{{ $t("communicator.scheduled.title") }}</h3>
    <p class="ld-muted">{{ $t("communicator.scheduled.note") }}</p>
    <p v-if="!rows.length" class="ld-muted">{{ $t("communicator.scheduled.empty") }}</p>
    <table v-else class="ld-table">
      <thead>
        <tr>
          <th>{{ $t("communicator.scheduled.company") }}</th>
          <th>{{ $t("communicator.scheduled.recipient") }}</th>
          <th>{{ $t("communicator.template.subject") }}</th>
          <th>{{ $t("communicator.scheduled.status") }}</th>
          <th>{{ $t("communicator.scheduled.at") }}</th>
          <th>{{ $t("communicator.scheduled.next_slot") }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" :data-message="row.id" data-testid="scheduled-row">
          <td>{{ row.render_context?.company_name || "—" }}</td>
          <td data-testid="scheduled-recipient">{{ row.thread?.recipient_email || "—" }}</td>
          <td>{{ row.subject }}</td>
          <td>{{ statusLabel(row.status) }}</td>
          <td>{{ formatDate(row.scheduled_at) }}</td>
          <td>{{ formatDate(row.next_slot) }}</td>
          <td>
            <span v-if="isDue(row)" class="ld-badge" data-testid="scheduled-due">{{ dueLabel(row) }}</span>
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
import { onMounted, ref } from "vue";
import { t } from "@/i18n";
import { GET_Messages, POST_SendNow } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { statusLabel } from "@/utils/leadsLabels";
import { formatTime } from "@/utils/leadsTime";

// Waiting messages (approved + scheduled). C-31: Send now only moves scheduled_at; the next send run sends.
// "Due" is read from the data (its slot is now or past), never from a local flag — a reload keeps the row honest.
const WAITING = ["approved", "scheduled"];
const rows = ref([]);
const error = ref("");
const formatDate = (iso) => formatTime(iso) || "—";

const isDue = (row) => Boolean(row.scheduled_at) && new Date(row.scheduled_at) <= new Date();

const dueLabel = (row) =>
  row.next_slot
    ? t("communicator.scheduled.due", { time: formatTime(row.next_slot) })
    : t("communicator.scheduled.due_unknown");

async function load() {
  const pages = await Promise.all(WAITING.map((status) => GET_Messages({ status, page_size: 100 })));
  rows.value = pages.flatMap((page) => page.data.results);
}

async function sendNow(row) {
  error.value = "";
  try {
    await POST_SendNow(row.id);
    await load();
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
  }
}

onMounted(load);
</script>
