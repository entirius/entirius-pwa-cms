<template>
  <section class="ld-field" data-testid="settings-scheduled">
    <h3>{{ $t("communicator.scheduled.title") }}</h3>
    <p class="ld-muted">{{ $t("communicator.scheduled.note") }}</p>
    <EmptyState v-if="!rows.length" icon="empty" :title="$t('communicator.scheduled.empty')" />
    <div v-else class="scheduled__scroll">
      <table class="table-basic ld-table">
        <thead>
          <tr>
            <th>{{ $t("communicator.scheduled.company") }}</th>
            <th>{{ $t("communicator.scheduled.recipient") }}</th>
            <th>{{ $t("communicator.template.subject") }}</th>
            <th>{{ $t("communicator.scheduled.status") }}</th>
            <th>{{ $t("communicator.scheduled.goes_out") }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" :data-message="row.id" data-testid="scheduled-row">
            <td>{{ companyName(row) }}</td>
            <td data-testid="scheduled-recipient">{{ recipient(row) || "—" }}</td>
            <td>{{ row.subject }}</td>
            <td>{{ statusLabel(row.status) }}</td>
            <td><span class="ld-badge" data-testid="scheduled-state">{{ sendStateLabel(row.state) }}</span></td>
            <td>
              <button v-if="row.movable" class="ld-btn" data-testid="scheduled-send-now" @click="sendNow(row)">
                {{ $t("communicator.scheduled.send_now") }}
              </button>
              <span v-else class="ld-muted" data-testid="scheduled-asap">{{ $t("communicator.scheduled.asap") }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="error" class="ld-error">{{ error }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import { GET_Policy, GET_WaitingMessages, POST_SendNow } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { sendStateLabel, statusLabel } from "@/utils/leadsLabels";
import { applyPolicy, canSendNow, sendState } from "@/utils/leadsTime";

// Waiting messages (approved + scheduled) with the one slot every screen reads, `next_slot`. C-31: Send now only
// pulls `scheduled_at` to the channel clock; the next send run sends. A mail already at the clock cannot be moved
// any earlier, so it offers no second Send now — its state says what still holds it.
const waiting = ref([]);
const error = ref("");

const rows = computed(() =>
  waiting.value.map((row) => ({
    ...row,
    state: sendState(row.next_slot),
    movable: canSendNow(row),
  }))
);

const recipient = (row) => row.thread?.recipient_email || row.thread?.recipient_name || "";

// Never an internal contact code: the company of the draft, else who it is addressed to.
const companyName = (row) => row.render_context?.company_name || recipient(row) || "—";

async function load() {
  const [mails, policy] = await Promise.all([GET_WaitingMessages(), GET_Policy().catch(() => null)]);
  applyPolicy(policy?.data);
  waiting.value = mails;
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

<style scoped>
/* The app content column clips (overflow: hidden): the table scrolls in its own box and its cells wrap, so
   the Send now column stays on screen at 1280 px with the sidebar open. */
.scheduled__scroll {
  overflow-x: auto;
}
.ld-table td {
  overflow-wrap: anywhere;
}
</style>
