<template>
  <ol class="tl" data-testid="thread-timeline">
    <li v-if="!entries.length && showEmpty" class="tl__empty" data-testid="thread-empty">{{ $t("leads.thread.empty") }}</li>
    <li
      v-for="(entry, i) in entries"
      :key="i"
      class="tl__entry"
      :class="`tl__entry--${entry.side}`"
      :data-testid="`timeline-${entry.side}`"
    >
      <!-- a skipped or withdrawn draft never went out: one closed line that opens to its text, never a bubble -->
      <details v-if="entry.side === 'skipped'" class="tl__skipped">
        <summary data-testid="timeline-skipped-line">{{ entry.skipped }}</summary>
        <p v-if="entry.fromLine" class="tl__from" data-testid="timeline-from">{{ entry.fromLine }}</p>
        <p v-if="entry.reason" class="tl__body">{{ entry.reason }}</p>
        <p v-if="entry.subject" class="tl__subject">{{ entry.subject }}</p>
        <p class="tl__body">{{ entry.body }}</p>
      </details>
      <div v-else class="tl__bubble">
        <!-- who a mail is from, on both sides: the sender of a reply, the mailbox our mail left (or will leave) from -->
        <p v-if="entry.fromLine" class="tl__from" data-testid="timeline-from">{{ entry.fromLine }}</p>
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
            :label="statusLabel(entry.status)"
            :title="badgeTitle(entry)"
            :data-testid="`status-${entry.status}`"
          />
        </p>
        <!-- when a waiting mail leaves: the badge's tooltip at a desk, a line of its own on a phone (never a cut badge) -->
        <p v-if="entry.sendState" class="tl__meta show-mobile" data-testid="timeline-send-state">{{ entry.sendState }}</p>
        <div v-if="entry.optout" class="tl__optout">
          <span v-if="entry.optout.optout_confirmed_at">{{ $t("leads.thread.optout_confirmed") }}</span>
          <template v-else>
            <span>{{ $t("leads.thread.optout_suspected") }}</span>
            <BasicButton variant="danger" :disabled="busy" mutates data-testid="confirm-optout" @click="asking = entry.optout.id">
              {{ $t("leads.thread.confirm_optout") }}
            </BasicButton>
            <!-- nothing is blocked by it: no confirmation -->
            <BasicButton :disabled="busy" mutates data-testid="dismiss-optout" @click="$emit('dismiss-optout', entry.optout.id)">
              {{ $t("leads.thread.not_optout") }}
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
import { messageTone, replyNextLine, replyTypeLabel, sendStateLabel, statusLabel } from "@/utils/leadsLabels";
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
  // an opt-out decision is in flight — the button stays disabled until it settles
  busy: { type: Boolean, default: false },
  // who the opt-out would block, named in its confirmation
  contact: { type: String, default: "" },
  // the company card: with it (and CRM on) an inbound bubble offers Reply, answered in Write mail
  company: { type: Object, default: null },
  threadId: { type: Number, default: null },
  // message ids written by hand (`composed` activities) for a timeline without the entries' own `composed` (an older
  // backend): no "Follow-up" tag, they are not sequence mails
  composed: { type: Array, default: () => [] },
  // the company card turns it off while earlier conversations hold the mail: one empty state, only when there is none
  showEmpty: { type: Boolean, default: true },
  // the thread's follow-up sequence state (`stopped_at`, `stop_reason`): what was applied after its newest reply
  sequence: { type: Object, default: null },
});
const emit = defineEmits(["confirm-optout", "dismiss-optout", "sent"]);

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

// The badge's tooltip: when a waiting mail leaves, or why a message was not sent.
const badgeTitle = (entry) => entry.sendState || (entry.status === "suppressed" ? t("leads.thread.suppressed_reason") : undefined);

function toggleQuote(index) {
  if (!quotesOpen.delete(index)) quotesOpen.add(index);
}

// A message entry carries its `message_id`, which names the waiting message (follow-ups share a subject).
function waitingState(item) {
  const waiting = props.waiting.find((message) => message.id === item.message_id);
  return sendStateLabel(sendState(waiting?.next_slot || ""));
}

// A rejected draft (communicator >= plan 25): skipped by a person, or withdrawn by the service with its reason.
function skippedEntry(item) {
  const date = formatTime(item.at);
  const skipped = item.rejected_by
    ? t("leads.thread.skipped_by", { name: item.rejected_by, date })
    : t("leads.thread.withdrawn", { reason: item.reject_reason || date });
  return { at: item.at, side: "skipped", skipped, fromLine: fromLine(item), reason: item.rejected_by && item.reject_reason ? t("leads.thread.skipped_reason", { reason: item.reject_reason }) : "", subject: item.subject, body: item.body_text };
}

// "From <address>": the sender of a reply, the mailbox our mail left or will leave from; none from an older backend.
const fromLine = (item) => (item.from_email ? t("leads.thread.from", { address: item.from_email }) : "");

function messageEntry(item, index, firstOut) {
  const out = item.direction === "out";
  if (out && item.status === "rejected") return skippedEntry(item);
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
    fromLine: fromLine(item),
    replyId: item.reply_id ?? null,
    kind: item.reply_kind || "",
  };
}

// A hand-written mail is no sequence step: it says so instead of "Follow-up".
function tagOf(item, out, index, firstOut) {
  if (!out) return "";
  if (item.composed || props.composed.includes(item.message_id)) return t("leads.history.event_composed");
  return index !== firstOut ? t("leads.thread.followup") : "";
}

// A classified reply says what happens next: the plan of its type for the sequence (communicator >= 0.5.0; the
// plans are read once per channel, a refusal leaves the plan out). Confidence shows below 100 % only.
const munin = useMuninStore();
const plans = ref({});
// The sequence stops a reply caused (a finished or bounced sequence is no answer to a reply).
const REPLY_STOPS = { replied: "stop", optout: "optout", paused: "pause" };

// The "Next:" line (`replyNextLine`): an opt-out of the reply first; for the newest reply what was applied to the
// thread's sequence (a pause keeps the plan's kind of pause), else the plan of its class.
function nextOf(entry) {
  if (entry.side !== "in") return "";
  const reply = entry.reply || {};
  // the reply's kind decides (a dismissed opt-out is a plain reply); a timeline without it falls back to the class
  const possibleOptout = entry.kind ? entry.kind === "suspected_optout" : reply.intent === "unsubscribe";
  const planned = plans.value[reply.intent]?.sequence || "";
  const applied = appliedStep(entry);
  const step = applied === "pause" && planned.startsWith("pause") ? planned : applied || planned;
  return replyNextLine({ optout: entry.optout, possibleOptout, step, returnDate: reply.intent_return_date || "" });
}

function appliedStep(entry) {
  const stopped = props.sequence?.stopped_at;
  if (entry !== newestReply.value || !stopped || new Date(stopped) < new Date(entry.at)) return "";
  return REPLY_STOPS[props.sequence.stop_reason] || "";
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

const newestReply = computed(() => entries.value.findLast((entry) => entry.side === "in") || null);

const entries = computed(() => {
  // the first mail that went out (a skipped draft before it is no step of the sequence)
  const firstOut = props.messages.findIndex((message) => message.direction === "out" && message.status !== "rejected");
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
.tl__skipped {
  flex: 1;
  font-size: var(--fs-200);
  color: var(--text-secondary);
}
.tl__skipped summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.tl__entry--in .tl__bubble {
  border-bottom-left-radius: var(--radius-base);
}
.tl__from,
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
.tl__from {
  overflow-wrap: anywhere;
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
