<template>
  <article
    class="inbox-row"
    :class="[`inbox-row--${marker}`, { 'inbox-row--active': active }]"
    :data-thread="row.id"
    data-testid="inbox-item"
  >
    <router-link :to="target" class="inbox-row__link">
      <span class="inbox-row__name" data-testid="inbox-item-name">{{ name }}</span>
      <span class="inbox-row__time">{{ formatTime(row.activity_at) }}</span>
      <!-- two drafts to one company differ by who gets them (FIX-17 item 4) -->
      <span v-if="marker === 'draft'" class="inbox-row__to" data-testid="inbox-item-to">
        {{ $t("leads.review.to") }}: {{ row.recipient_email || row.recipient_name }}
      </span>
      <span class="inbox-row__subject" data-testid="inbox-item-subject">{{ subject }}</span>
      <span class="inbox-row__state" data-testid="inbox-item-state">
        <FontAwesomeIcon v-if="marker === 'waiting'" icon="clock" class="inbox-row__clock" />
        <strong v-if="marker !== 'none'" class="inbox-row__marker" :data-testid="`inbox-marker-${marker}`">{{ markerText }}</strong>
        <template v-else>{{ $t(`leads.thread.state.${row.status}`) }}</template><template v-if="detail"> · {{ detail }}</template>
      </span>
    </router-link>
    <button
      v-if="marker === 'waiting' && canSendNow(row.waiting)"
      class="inbox-row__send"
      data-testid="inbox-item-send-now"
      @click="$emit('send-now', row.waiting.id)"
    >
      {{ $t("communicator.scheduled.send_now") }}
    </button>
  </article>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import { useMuninStore } from "@/stores/munin";
import { loadCompanyName } from "@/utils/leadsCompanyNames";
import { sendStateSentence } from "@/utils/leadsLabels";
import { splitQuote } from "@/utils/leadsThread";
import { canSendNow, formatTime, sendState } from "@/utils/leadsTime";
import { companyIdFromSubjectRef, routeForSubjectRef } from "@/utils/subjectRef";

// One thread of the Inbox. The row keeps one layout; a single marker says what it waits for: a draft to review,
// a mail waiting for the send beat (clock + the `sendState` sentence, the one wording of a departure) or a reply.
const props = defineProps({
  row: { type: Object, required: true }, // a `threads/` row: thread + subject, last_text, draft, waiting
  filter: { type: String, default: "all" },
  active: { type: Boolean, default: false },
});
defineEmits(["send-now"]);

const munin = useMuninStore();
const companyName = ref("");

// The chip the user looks through decides the marker of a thread that is in several states at once.
const MARKER_ORDER = { all: ["draft", "replied", "waiting"], draft: ["draft"], waiting: ["waiting"], replied: ["replied"] };
const holds = {
  draft: (row) => Boolean(row.draft),
  waiting: (row) => Boolean(row.waiting),
  replied: (row) => row.status === "replied",
};
const marker = computed(() => (MARKER_ORDER[props.filter] || MARKER_ORDER.all).find((key) => holds[key](props.row)) || "none");

const markerText = computed(
  () =>
    ({
      draft: t("leads.inbox.marker_draft"),
      replied: t("leads.thread.state.replied"),
      waiting: sendStateSentence(sendState(props.row.waiting?.next_slot)),
    })[marker.value]
);

const firstLine = (text) => splitQuote(text).own.split("\n").find((line) => line.trim()) || "";
const detail = computed(() => (marker.value === "waiting" ? "" : firstLine(props.row.last_text)));
const subject = computed(() => (marker.value === "draft" ? props.row.draft.subject : props.row.subject) || t("leads.inbox.untitled"));
const name = computed(() => companyName.value || props.row.recipient_name || props.row.recipient_email);

// A company's thread lives in the leads module: with leads off (communicator alone) it opens as a thread by id, and
// no company is looked up.
const leadsOn = computed(() => munin.isModuleEnabled("leads"));

// A draft opens Review; any other thread opens where it opens today — the company thread, else the thread by id.
const target = computed(() => {
  if (marker.value === "draft") return { name: "LeadsReview", params: { id: props.row.draft.id } };
  const company = leadsOn.value && routeForSubjectRef(props.row.subject_ref);
  return company || { name: "LeadsConversation", params: { id: props.row.id } };
});

onMounted(async () => {
  const companyId = leadsOn.value && companyIdFromSubjectRef(props.row.subject_ref);
  if (companyId) companyName.value = await loadCompanyName(companyId);
});
</script>

<style scoped>
.inbox-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
  border: 1px solid var(--c-basic-300);
  border-radius: 8px;
  background: var(--c-basic-100);
}
.inbox-row--draft,
.inbox-row--replied {
  border-left: 3px solid var(--c-support-400);
}
.inbox-row--active {
  border-color: var(--c-support-400);
}
.inbox-row__link {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.15rem var(--space-200);
  min-height: 56px;
  padding: var(--space-200) var(--space-300);
  color: var(--c-basic-800);
  text-decoration: none;
}
.inbox-row__name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.inbox-row__time {
  font-size: var(--fs-100);
  color: var(--c-basic-500);
}
.inbox-row__to,
.inbox-row__subject,
.inbox-row__state {
  grid-column: 1 / -1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--c-basic-600);
}
.inbox-row__state {
  font-size: var(--fs-100);
}
.inbox-row__marker {
  color: var(--c-support-400);
}
.inbox-row--waiting .inbox-row__marker {
  font-weight: 400;
  color: var(--c-basic-600);
}
.inbox-row__clock {
  margin-right: 0.25rem;
  color: var(--c-basic-500);
}
.inbox-row__send {
  align-self: flex-start;
  min-height: 44px;
  margin: 0 var(--space-300) var(--space-200);
  padding: 0 var(--space-400);
  border: 1px solid var(--c-basic-300);
  border-radius: 8px;
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  cursor: pointer;
}
</style>
