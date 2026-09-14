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
      <template v-if="entry.side === 'note'">
        <span class="tl__note">{{ entry.text }} · {{ formatTime(entry.at) }}</span>
      </template>
      <div v-else class="tl__bubble">
        <p v-if="entry.tag" class="tl__tag">{{ entry.tag }}</p>
        <p v-if="entry.subject" class="tl__subject">{{ entry.subject }}</p>
        <p class="tl__body">{{ entry.text }}</p>
        <p class="tl__meta">
          <span>{{ formatTime(entry.at) }}</span>
          <span v-if="entry.status" class="tl__status" :data-testid="`status-${entry.status}`">
            {{ $t(`leads.status.${entry.status}`) }}
          </span>
        </p>
        <div v-if="entry.optout" class="tl__optout">
          <span v-if="entry.optout.optout_confirmed_at">{{ $t("leads.thread.optout_confirmed") }}</span>
          <template v-else>
            <span>{{ $t("leads.thread.optout_suspected") }}</span>
            <button class="tl__confirm" data-testid="confirm-optout" @click="$emit('confirm-optout', entry.optout.id)">
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
import { formatTime } from "@/utils/leadsTime";

// One chat timeline per company: thread messages and replies (communicator) plus leads activities as notes.
const props = defineProps({
  messages: { type: Array, default: () => [] },
  activities: { type: Array, default: () => [] },
  optouts: { type: Array, default: () => [] },
});
defineEmits(["confirm-optout"]);

// Index of the first outbound message of each thread; later ones are follow-ups.
function firstOutIndexes(messages) {
  const first = new Map();
  messages.forEach((m, i) => {
    if (m.direction === "out" && !first.has(m.thread)) first.set(m.thread, i);
  });
  return new Set(first.values());
}

function messageEntry(item, index, firstOut) {
  const out = item.direction === "out";
  return {
    at: item.at,
    side: out ? "out" : "in",
    subject: item.subject,
    text: item.body_text,
    status: out ? item.status : "",
    tag: out && !firstOut.has(index) ? t("leads.thread.followup") : "",
    optout: out ? null : props.optouts.find((reply) => reply.received_at === item.at) || null,
  };
}

const entries = computed(() => {
  const firstOut = firstOutIndexes(props.messages);
  const notes = props.activities.map((a) => ({ at: a.created_at, side: "note", text: a.message }));
  const bubbles = props.messages.map((m, i) => messageEntry(m, i, firstOut));
  return [...bubbles, ...notes].sort((a, b) => new Date(a.at) - new Date(b.at));
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
.tl__entry--note {
  justify-content: center;
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
.tl__note {
  font-size: var(--fs-100);
  color: var(--c-basic-500);
  text-align: center;
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
</style>
