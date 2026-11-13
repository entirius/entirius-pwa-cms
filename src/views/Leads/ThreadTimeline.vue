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
        <p v-if="entry.tag" class="tl__tag" data-testid="timeline-tag">{{ entry.tag }}</p>
        <p v-if="entry.subject" class="tl__subject">{{ entry.subject }}</p>
        <p v-if="entry.reply" class="tl__type">
          <StatusBadge :tone="replyTone(entry.reply.intent)" :label="replyTypeLabel(entry.reply.intent)" data-testid="reply-type" :data-type="entry.reply.intent" />
          <StatusBadge v-if="entry.reply.needs_review" tone="neutral" :label="$t('leads.history.needs_review')" data-testid="reply-needs-review" />
          <span v-if="entry.reply.intent_return_date" data-testid="reply-back-on">
            {{ $t("leads.history.back_on", { date: formatDay(entry.reply.intent_return_date) }) }}
          </span>
        </p>
        <p class="tl__body">{{ entry.text.own }}</p>
        <template v-if="entry.text.quoted">
          <BasicButton
            class="tl__quote-toggle"
            variant="ghost"
            size="sm"
            :aria-expanded="String(quotesOpen.has(i))"
            data-testid="timeline-quote-toggle"
            @click="toggleQuote(i)"
          >
            {{ $t(quotesOpen.has(i) ? "leads.thread.quote_hide" : "leads.thread.quote_show") }}
          </BasicButton>
          <p v-if="quotesOpen.has(i)" class="tl__body tl__quote" data-testid="timeline-quote">{{ entry.text.quoted }}</p>
        </template>
        <p v-if="nextOf(entry)" class="tl__next" data-testid="reply-next">{{ nextOf(entry) }}</p>
        <p class="tl__meta">
          <span v-if="!entry.sendState" data-testid="timeline-time">{{ formatTime(entry.at) }}</span>
          <span v-if="sureOf(entry)">{{ sureOf(entry) }}</span>
          <StatusBadge
            v-if="entry.status"
            size="sm"
            :tone="messageTone(entry.status)"
            :label="statusText(entry)"
            :data-testid="`status-${entry.status}`"
          />
        </p>
        <div v-if="entry.optout" class="tl__optout">
          <span v-if="entry.optout.optout_confirmed_at">{{ $t("leads.thread.optout_confirmed") }}</span>
          <template v-else>
            <span>{{ $t("leads.thread.optout_suspected") }}</span>
            <BasicButton variant="danger" :disabled="busy" data-testid="confirm-optout" @click="asking = entry.optout.id">
              {{ $t("leads.thread.confirm_optout") }}
            </BasicButton>
          </template>
        </div>
        <BasicButton v-if="canReply && entry.side === 'in'" class="tl__reply" size="sm" mutates data-testid="reply-compose" @click="openReply(entry)">
          {{ $t("leads.history.reply") }}
        </BasicButton>
      </div>
    </li>
  </ol>
  <ConfirmDialog
    :open="asking !== null"
    tone="danger"
    :title="$t('leads.thread.confirm_optout')"
    :message="$t('leads.thread.optout_confirm_message', { contact })"
    :confirm-label="$t('leads.thread.confirm_optout')"
    confirm-testid="confirm-optout-yes"
    @confirm="confirmOptout"
    @cancel="asking = null"
  />
  <ComposeDialog v-if="company" v-model:open="composeOpen" :company="company" :reply="replying" @sent="$emit('sent')" />
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { useMuninStore } from "@/stores/munin";
import { formatDay } from "@/utils/format";
import { messageTone, replyTypeLabel, sendStateLabel, statusLabel } from "@/utils/leadsLabels";
import { outboundOn, replyTone } from "@/utils/leadsOutbound";
import { replyForCompose } from "@/utils/leadsReply";
import { loadReplyPlans } from "@/utils/leadsReplyPlans";
import { splitQuote } from "@/utils/leadsThread";
import { formatTime, sendState } from "@/utils/leadsTime";
import { useNotifyStore } from "@/stores/notify";
import ComposeDialog from "./ComposeDialog.vue";

// The chat timeline of ONE communicator thread: our messages and the replies, oldest first.
const props = defineProps({
  messages: { type: Array, default: () => [] },
  optouts: { type: Array, default: () => [] },
  // approved/scheduled messages of this thread — their `next_slot` is what a waiting bubble says, as in the Inbox
  waiting: { type: Array, default: () => [] },
  // an opt-out confirmation is in flight — the button stays disabled until it settles
  busy: { type: Boolean, default: false },
  // who the opt-out would block, named in its confirmation
  contact: { type: String, default: "" },
  // the company card: with it (and CRM on) an inbound bubble offers Reply, answered in Write mail
  company: { type: Object, default: null },
  threadId: { type: Number, default: null },
  // message ids written by hand (`composed` activities): no "Follow-up" tag, they are not sequence mails
  composed: { type: Array, default: () => [] },
});
const emit = defineEmits(["confirm-optout", "sent"]);

const WAITING_STATUSES = ["approved", "scheduled"];
const quotesOpen = reactive(new Set());
const notify = useNotifyStore();
const asking = ref(null);
const composeOpen = ref(false);
const replying = ref(null);

function confirmOptout() {
  emit("confirm-optout", asking.value);
  asking.value = null;
}

async function openReply(entry) {
  try {
    replying.value = await replyForCompose(props.threadId, entry, props.company.contacts);
    composeOpen.value = true;
  } catch {
    notify.spawnNotification({ msg: t("leads.compose.reply_unavailable"), type: "negative" });
  }
}

const statusText = (entry) => [statusLabel(entry.status), entry.sendState].filter(Boolean).join(" · ");

function toggleQuote(index) {
  if (!quotesOpen.delete(index)) quotesOpen.add(index);
}

// A message entry carries its `message_id`, which names the waiting message (follow-ups share a subject).
function waitingState(item) {
  const waiting = props.waiting.find((message) => message.id === item.message_id);
  return sendStateLabel(sendState(waiting?.next_slot || ""));
}

function messageEntry(item, index, firstOut) {
  const out = item.direction === "out";
  const waiting = out && WAITING_STATUSES.includes(item.status);
  return {
    at: item.at,
    side: out ? "out" : "in",
    subject: item.subject,
    text: splitQuote(item.body_text),
    status: out ? item.status : "",
    sendState: waiting ? waitingState(item) : "",
    tag: tagOf(item, out, index, firstOut),
    optout: out ? null : props.optouts.find((reply) => reply.received_at === item.at) || null,
    reply: !out && item.intent ? item : null,
    body: item.body_text,
    from: item.from_email,
    replyId: item.reply_id ?? null,
  };
}

// A hand-written mail is no sequence step: it says so instead of "Follow-up".
function tagOf(item, out, index, firstOut) {
  if (!out) return "";
  if (props.composed.includes(item.message_id)) return t("leads.history.event_composed");
  return index !== firstOut ? t("leads.thread.followup") : "";
}

// A classified reply says what happens next: the plan of its type for the sequence (communicator >= 0.5.0; the
// plans are read once per channel, a refusal leaves the line out). Confidence shows below 100 % only.
const munin = useMuninStore();
const plans = ref({});
const SEQUENCE_STEP = { stop: "leads.history.seq_stopped", pause: "leads.history.seq_paused" };

function nextOf(entry) {
  const plan = entry.reply && plans.value[entry.reply.intent];
  if (!plan) return "";
  const until = plan.sequence === "pause_until_return" && entry.reply.intent_return_date;
  const step = until
    ? t("leads.history.seq_paused_until", { date: formatDay(entry.reply.intent_return_date) })
    : t(SEQUENCE_STEP[plan.sequence] || "leads.history.seq_paused");
  return t("leads.history.next", { steps: step });
}

function sureOf(entry) {
  const confidence = entry.reply?.intent_confidence;
  return confidence !== null && confidence !== undefined && confidence < 1
    ? t("leads.history.confidence", { n: Math.round(confidence * 100) })
    : "";
}

onMounted(async () => {
  if (outboundOn(munin, "communicator")) plans.value = await loadReplyPlans();
});

const canReply = computed(
  () => Boolean(props.company) && !props.company.do_not_contact && outboundOn(munin, "leads") && outboundOn(munin, "communicator")
);

const entries = computed(() => {
  const firstOut = props.messages.findIndex((message) => message.direction === "out");
  return props.messages.map((message, i) => messageEntry(message, i, firstOut));
});
</script>

<style scoped>
.tl {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}
.tl__type {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
}
.tl__next {
  margin: var(--space-2) 0 0;
  font-size: var(--fs-200);
  color: var(--text-secondary);
}
.tl__empty {
  color: var(--text-muted);
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
  padding: var(--space-5) var(--space-8);
  border-radius: var(--radius-xl);
  background: var(--surface-raised);
  color: var(--text-body);
}
.tl__entry--out .tl__bubble {
  background: var(--accent-subtle);
  border-bottom-right-radius: var(--radius-base);
}
.tl__entry--in .tl__bubble {
  border-bottom-left-radius: var(--radius-base);
}
.tl__tag,
.tl__meta {
  margin: 0;
  font-size: var(--fs-200);
  color: var(--text-secondary);
}
.tl__meta {
  display: flex;
  gap: var(--space-5);
  justify-content: flex-end;
}
.tl__subject {
  margin: 0 0 var(--space-2);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.tl__body {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.tl__quote-toggle {
  margin-top: var(--space-2);
}
.tl__quote {
  margin-top: var(--space-2);
  color: var(--text-secondary);
}
/* A phone has no width to spare: bubbles take nearly the whole line and a slimmer padding. */
@media (max-width: 1023px) {
  .tl__bubble {
    max-width: 95%;
    padding: var(--space-5);
  }
}
.tl__reply {
  margin-top: var(--space-2);
}
.tl__optout {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  align-items: center;
  margin-top: var(--space-5);
  color: var(--negative);
}
</style>
