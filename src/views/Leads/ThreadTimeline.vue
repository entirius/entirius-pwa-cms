<template>
  <ol class="tl" data-testid="thread-timeline">
    <li v-if="!entries.length" class="tl__empty">{{ $t("leads.thread.empty") }}</li>
    <li
      v-for="(entry, i) in entries"
      :key="i"
      class="tl__entry"
      :class="`tl__entry--${entry.side}`"
      :data-testid="`timeline-${entry.side}`"
    >
      <div class="tl__bubble">
        <p v-if="entry.tag" class="tl__tag">{{ entry.tag }}</p>
        <p v-if="entry.subject" class="tl__subject">{{ entry.subject }}</p>
        <p class="tl__body">{{ entry.text }}</p>
        <p class="tl__meta">
          <span data-testid="timeline-time">{{ formatTime(entry.at) }}</span>
          <span v-if="entry.status" class="tl__status" :data-testid="`status-${entry.status}`">
            {{ $t(`leads.status.${entry.status}`) }}<template v-if="entry.held"> · {{ $t("leads.status.held") }}</template>
          </span>
        </p>
        <div v-if="entry.optout" class="tl__optout">
          <span v-if="entry.optout.optout_confirmed_at">{{ $t("leads.thread.optout_confirmed") }}</span>
          <template v-else>
            <span>{{ $t("leads.thread.optout_suspected") }}</span>
            <button class="tl__confirm" :disabled="busy" data-testid="confirm-optout" @click="$emit('confirm-optout', entry.optout.id)">
              {{ $t("leads.thread.confirm_optout") }}
            </button>
          </template>
        </div>
      </div>
    </li>
  </ol>
</template>

<script setup>
import { computed } from "vue";
import { t } from "@/i18n";
import { formatTime, isOverdue } from "@/utils/leadsTime";

// The chat timeline of ONE communicator thread: our messages and the replies, oldest first.
const props = defineProps({
  messages: { type: Array, default: () => [] },
  optouts: { type: Array, default: () => [] },
  // approved/scheduled messages of this thread — their `scheduled_at` is the time a waiting bubble shows
  waiting: { type: Array, default: () => [] },
  // an opt-out confirmation is in flight — the button stays disabled until it settles
  busy: { type: Boolean, default: false },
});
defineEmits(["confirm-optout"]);

const WAITING_STATUSES = ["approved", "scheduled"];

function slotOf(item) {
  return props.waiting.find((message) => message.subject === item.subject)?.scheduled_at || item.at;
}

function messageEntry(item, index, firstOut) {
  const out = item.direction === "out";
  const waiting = out && WAITING_STATUSES.includes(item.status);
  const at = waiting ? slotOf(item) : item.at;
  return {
    at,
    side: out ? "out" : "in",
    subject: item.subject,
    text: item.body_text,
    status: out ? item.status : "",
    held: waiting && isOverdue(at),
    tag: out && index !== firstOut ? t("leads.thread.followup") : "",
    optout: out ? null : props.optouts.find((reply) => reply.received_at === item.at) || null,
  };
}

const entries = computed(() => {
  const firstOut = props.messages.findIndex((message) => message.direction === "out");
  return props.messages.map((message, i) => messageEntry(message, i, firstOut));
});
</script>

<style scoped>
.tl {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  margin: 0;
  padding: 0;
  list-style: none;
}
.tl__empty {
  color: var(--c-basic-500);
  text-align: center;
}
.tl__entry {
  display: flex;
}
.tl__entry--out {
  justify-content: flex-end;
}
.tl__bubble {
  max-width: 85%;
  padding: var(--space-200) var(--space-300);
  border-radius: 12px;
  background: var(--c-basic-200);
  color: var(--c-basic-800);
}
.tl__entry--out .tl__bubble {
  background: var(--c-support-100);
  border-bottom-right-radius: 4px;
}
.tl__entry--in .tl__bubble {
  border-bottom-left-radius: 4px;
}
.tl__tag,
.tl__meta {
  margin: 0;
  font-size: var(--fs-100);
  color: var(--c-basic-600);
}
.tl__meta {
  display: flex;
  gap: var(--space-200);
  justify-content: flex-end;
}
.tl__status {
  font-weight: 600;
}
.tl__subject {
  margin: 0 0 var(--space-100);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.tl__body {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.tl__optout {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-200);
  align-items: center;
  margin-top: var(--space-200);
  color: var(--c-negative-300);
}
.tl__confirm {
  min-height: 44px;
  padding: 0 var(--space-300);
  border: 1px solid var(--c-negative-300);
  border-radius: 8px;
  background: var(--c-basic-100);
  color: var(--c-negative-300);
  font-weight: 600;
  cursor: pointer;
}
.tl__confirm:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
