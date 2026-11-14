<template>
  <PageLayout class="review" data-testid="leads-review">
    <template #header>
      <PageHeader :title="$t('leads.review.title')" :crumbs="approvalsCrumbs" :back="goInbox" />
    </template>
    <div class="review__body flex-column gap-4">
      <Loader block v-show="loading" />

      <!-- T2/T4 (walk 4): Skip and Send confirm in place — one line above the next draft for 4 s, read out, never a toast
           over the action row; the region stays in the page so a screen reader announces its change -->
      <p class="review__confirm" :class="{ 'review__confirm--shown': confirmation }" role="status" data-testid="review-confirmation">
        {{ confirmation }}
      </p>
      <EmptyState v-if="queueEmpty" :title="$t('leads.inbox.empty_title')" icon="success" size="md" data-testid="review-empty">
        <BasicButton variant="primary" data-testid="review-empty-inbox" @click="goInbox">{{ $t("leads.review.back") }}</BasicButton>
      </EmptyState>

      <!-- the address of a draft that left the queue: what happened to it, and the way on (never another draft unasked) -->
      <div v-if="handled" class="flex-column gap-4" role="status" data-testid="review-handled">
        <p class="m-0">{{ handledText }}</p>
        <BasicButton class="as-s" variant="primary" data-testid="review-handled-next" @click="goNext()">{{ $t("leads.review.next_draft") }}</BasicButton>
      </div>

      <AiToolboxHint />
      <ConfigBanner code="communicator.smtp" />

      <div v-if="failedVersion" class="review__failed flex-column gap-4" role="alert" data-testid="review-failed">
        <p class="review__failed-text m-0">
          {{ $t("leads.review.rewrite_failed", { reason: failedVersion.failure_detail || failedVersion.failure_code }) }}
        </p>
        <ActionBar :actions="failedActions" />
      </div>

      <article
        v-else-if="message"
        class="review__draft flex-column gap-4"
        :style="{ transform: `translateX(${offset}px)` }"
        data-testid="review-draft"
        v-on="editing ? {} : handlers"
      >
        <header class="flex-column">
          <router-link v-if="companyId" :to="{ name: 'LeadsThread', params: { id: companyId } }" class="review__company">
            {{ companyName }}
          </router-link>
          <span v-else class="review__company">{{ companyName }}</span>
          <span class="review__meta" data-testid="review-to">
            <template v-if="sender"><span data-testid="review-from">{{ $t("leads.thread.from", { address: sender }) }}</span> · </template>
            {{ $t("leads.review.to") }}: {{ message.thread?.recipient_email }}
          </span>
          <span v-if="problem" class="review__meta flex ai-ct flex-wrap gap-2" data-testid="review-problem">
            <StatusBadge tone="warning" :label="$t('leads.approvals.problem')" />
            {{ $t("leads.review.problem", { detail: problem }) }}
          </span>
          <span v-if="lastReply" class="review__meta flex ai-ct flex-wrap gap-2" data-testid="review-last-reply">
            {{ $t("leads.review.last_reply") }}:
            <StatusBadge :tone="replyTone(lastReply.intent)" :label="replyTypeLabel(lastReply.intent)" data-testid="reply-type" :data-type="lastReply.intent" />
          </span>
          <span v-if="queueTotal" class="review__meta" data-testid="review-position">
            {{ $t("leads.review.queue_position", { index: queueIndex, count: queueTotal }) }}
          </span>
        </header>

        <IntelCard v-if="munin.isModuleEnabled('siteintel')" :context="message.render_context" />

        <template v-if="editing">
          <FormField :label="$t('leads.review.subject')">
            <BasicInput v-model="draft.subject" data-testid="edit-subject" />
          </FormField>
          <FormField :label="$t('leads.review.body')">
            <BasicTextarea v-model="draft.body_text" :rows="12" data-testid="edit-body" />
          </FormField>
          <ActionBar :actions="editActions" />
        </template>
        <template v-else>
          <h2 class="review__subject fs-400 fw-600 m-0" data-testid="review-subject">{{ message.subject }}</h2>
          <p class="review__text m-0" data-testid="review-body">{{ message.body_text }}</p>
          <p v-if="!isDesktop" class="t-muted fs-200 m-0" data-testid="review-swipe-hint">{{ $t("leads.review.swipe_hint") }}</p>
        </template>
      </article>
    </div>

    <BasicModal
      v-model:open="rewriteOpen"
      :title="$t('leads.rewrite.title')"
      :actions="rewriteActions"
      data-testid="rewrite-modal"
    >
      <FormField :label="$t('leads.rewrite.label')" hint-level="important" :hint="$t('leads.rewrite.hint')">
        <BasicTextarea v-model="rewriteNotes" :rows="4" :placeholder="$t('leads.rewrite.placeholder')" data-testid="rewrite-notes" />
      </FormField>
    </BasicModal>
    <ConfirmDialog
      :open="discarding"
      :title="$t('leads.review.discard_title')"
      :message="$t('leads.review.discard_confirm')"
      :confirm-label="$t('leads.review.discard_yes')"
      :cancel-label="$t('leads.review.discard_keep')"
      tone="danger"
      @confirm="settleDiscard(true)"
      @cancel="settleDiscard(false)"
    />

    <!-- pinned to the bottom of the scroll body on every size; Review keeps the phone tab bar off (meta.noBottomBar) -->
    <template v-if="message && !editing && !failedVersion" #footer>
      <ReviewActions
        ref="reviewActions"
        :busy="busy"
        :ai-disabled="aiDisabled"
        :blocked="problem"
        @send="accept"
        @skip="skip"
        @rewrite="openRewrite"
        @edit="startEdit"
        @skip-company="skipCompany"
      />
    </template>
  </PageLayout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { isConflict } from "@/api/createClient";
import * as api from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useLeadsReviewStore } from "@/stores/leadsReview";
import { useLeadsChannelStore } from "@/stores/leadsChannel";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";
import { useSwipe } from "@/composables/useSwipe";
import { useIsDesktop } from "@/composables/useIsDesktop";
import { companyIdFromSubjectRef } from "@/utils/subjectRef";
import { replyTypeLabel, sendStateSentence, statusLabel } from "@/utils/leadsLabels";
import { FROM_APPROVALS, outboundOn, problemText, replyTone } from "@/utils/leadsOutbound";
import { sendState } from "@/utils/leadsTime";
import AiToolboxHint from "@/components/ConfigHealth/AiToolboxHint.vue";
import ConfigBanner from "@/components/ConfigHealth/ConfigBanner.vue";
import { useConfigHealthStore } from "@/stores/configHealth";
import IntelCard from "./IntelCard.vue";
import ReviewActions from "./ReviewActions.vue";

const CONFIRMATION_MS = 4000;

const route = useRoute();
const router = useRouter();
const munin = useMuninStore();
const configHealth = useConfigHealthStore();
const notify = useNotifyStore();
const reviewQueue = useLeadsReviewStore();

const message = ref(null);
const loading = ref(false);
const busy = ref(false);
const editing = ref(false);
const rewriteOpen = ref(false);
const rewriteNotes = ref("");
const confirmation = ref("");
const queueEmpty = ref(false);
const failedVersion = ref(null);
const draft = ref({ subject: "", body_text: "" });
const queueIndex = ref(0);
const queueTotal = ref(0);
const discarding = ref(false);
let confirmationTimer = null;
let settle = null;

const { offset, handlers } = useSwipe({ onRight: accept, onLeft: skip });
// The swipe hint is for a touch screen: a desk has the buttons (acceptance c6).
const isDesktop = useIsDesktop();

const companyId = computed(() => companyIdFromSubjectRef(message.value?.thread?.subject_ref));
const companyName = computed(
  () => message.value?.render_context?.company_name || message.value?.thread?.recipient_name || ""
);
const aiDisabled = computed(() => !configHealth.aiUsable);
const failedActions = computed(() => [
  { key: "back", label: t("leads.review.cancel"), role: "secondary", testid: "failed-back", onClick: () => (failedVersion.value = null) },
  { key: "retry", label: t("leads.review.retry"), role: "primary", testid: "failed-retry", onClick: retryRewrite },
]);
const editActions = computed(() => [
  { key: "cancel", label: t("leads.review.cancel"), role: "secondary", testid: "edit-cancel", onClick: cancelEdit },
  { key: "save", label: t("leads.review.save"), role: "primary", disabled: busy.value, testid: "edit-save", onClick: saveEdit },
]);
// The reviewer's note for an AI rewrite of the draft.
const rewriteActions = computed(() => [
  { key: "cancel", label: t("leads.review.cancel"), role: "secondary", testid: "rewrite-cancel", onClick: () => (rewriteOpen.value = false) },
  {
    key: "submit",
    label: t("leads.rewrite.submit"),
    role: "primary",
    disabled: !rewriteNotes.value.trim(),
    testid: "rewrite-submit",
    onClick: () => rewrite(rewriteNotes.value.trim()),
  },
]);
const unsaved = computed(
  () => editing.value && (draft.value.subject !== message.value?.subject || draft.value.body_text !== message.value?.body_text)
);

// Leaving Edit (Cancel, Inbox, another draft) with unsaved changes asks first — in the app sheet, not the browser's.
function confirmDiscard() {
  if (!unsaved.value) return Promise.resolve(true);
  discarding.value = true;
  return new Promise((resolve) => {
    settle = resolve;
  });
}

function settleDiscard(discard) {
  discarding.value = false;
  settle?.(discard);
  settle = null;
}

onBeforeRouteLeave(confirmDiscard);
onBeforeRouteUpdate(confirmDiscard);

// N9: a draft still in review opens itself; one that left the queue (sent, scheduled, skipped, gone) says so.
const REVIEW_STATUS = "review_required";
const handled = ref(null); // the status of a draft that left the queue, "gone" when it is not there at all
// A skipped draft says it will not be sent, in the word of the action (Skip), never only a status.
const HANDLED_SENTENCES = { gone: "leads.review.gone", rejected: "leads.review.handled_rejected" };
const handledText = computed(() =>
  t(HANDLED_SENTENCES[handled.value] || "leads.review.handled", { state: statusLabel(handled.value) })
);

// Only the latest read writes the screen (Next, a conflict and the accept timer may change the draft quickly); a failed
// read shows no draft rather than the previous one under the new address.
let latestRead = 0;

async function load() {
  const read = ++latestRead;
  message.value = null; // the old draft is never on screen (or under Send) while the next one loads
  loading.value = true;
  try {
    const found = await api.GET_ReviewMessage(route.params.id).catch(() => undefined);
    if (read !== latestRead) return;
    if (found === undefined) return notify.spawnNotification({ msg: t("leads.review.error"), type: "negative" });
    handled.value = found?.status === REVIEW_STATUS ? null : found?.status || "gone";
    message.value = handled.value ? null : found;
    if (handled.value) return;
    await Promise.all([loadQueuePosition(), loadOutbound()]);
  } finally {
    if (read === latestRead) loading.value = false;
  }
}

// communicator >= 0.5.0: what would stop this draft (the Approvals row's `blocker`, said before Send), the type of
// the thread's newest classified reply and the mailbox the draft will leave from (its timeline entry's `from_email`,
// empty from an older backend). None blocks the screen when it cannot be read.
const problem = ref("");
const lastReply = ref(null);
const sender = ref("");

async function findBlocker(draft) {
  const params = { search: draft.thread?.recipient_email, channel: useLeadsChannelStore().activeChannelIdx };
  const { data } = await api.GET_Approvals(params);
  const row = (data.results || []).find((item) => item.id === draft.id);
  return row?.blocker ? problemText(row.blocker) : "";
}

async function findLastReply(draft) {
  const { data } = await api.GET_Replies({ thread: draft.thread?.id });
  return (data.results || []).find((reply) => reply.intent) || null;
}

async function findSender(draft) {
  const { data } = await api.GET_Thread(draft.thread?.id);
  return (data.timeline || []).find((entry) => entry.message_id === draft.id)?.from_email || "";
}

async function loadOutbound() {
  problem.value = "";
  lastReply.value = null;
  sender.value = "";
  if (!outboundOn(munin, "communicator")) return;
  const draft = message.value;
  const [blocker, reply, from] = await Promise.allSettled([findBlocker(draft), findLastReply(draft), findSender(draft)]);
  if (message.value !== draft) return;
  problem.value = blocker.status === "fulfilled" ? blocker.value : "";
  lastReply.value = reply.status === "fulfilled" ? reply.value : null;
  sender.value = from.status === "fulfilled" ? from.value : "";
}

// "Draft 2 of 3" (as the Inbox lists them): after a send the next draft is visibly another one, not the same screen again.
async function loadQueuePosition() {
  try {
    queue.value = await readQueue();
    queueTotal.value = queue.value.length;
    queueIndex.value = queue.value.indexOf(message.value.id) + 1;
  } catch {
    queueTotal.value = 0;
  }
}

// k6 (walk 4): the queue in the Inbox's order — its Drafts rows (one per company, newest activity first), then the drafts
// no row shows (a second draft to one company), newest first — so "Draft 1" is the top row of the list.
async function readQueue() {
  const [rows, drafts] = await Promise.all([
    api.GET_Conversations({ state: "draft", page_size: 100 }),
    api.GET_ReviewList({ status: REVIEW_STATUS, page_size: 100 }),
  ]);
  const listed = (rows.data.results || []).map((row) => row.draft?.id).filter(Boolean);
  const rest = (drafts.data.results || []).map((item) => item.id).filter((id) => !listed.includes(id));
  return [...listed, ...rest.reverse()];
}

// N7: the next draft is the one below in the Inbox order (else the one above) — "Draft 1 of 19" goes on to the new
// "Draft 1 of 18"; the service's next only when this draft is not in the list read.
const queue = ref([]);
function followingId() {
  const at = queue.value.indexOf(message.value?.id);
  return at < 0 ? null : queue.value[at + 1] ?? queue.value[at - 1] ?? null;
}

// After Skip or Send (`afterAction`) an empty queue keeps the screen; otherwise it is the way back.
async function goNext(afterAction = false) {
  const id = followingId();
  if (id) return router.replace({ name: "LeadsReview", params: { id }, ...(fromApprovals.value && { query: route.query }) });
  try {
    const { data } = await api.GET_ReviewNext();
    router.replace({ name: "LeadsReview", params: { id: data.id }, ...(fromApprovals.value && { query: route.query }) });
  } catch {
    if (!afterAction) return goInbox();
    message.value = null; // the confirmation stands above the empty state
    queueEmpty.value = true;
  }
}

function confirm(text) {
  clearTimeout(confirmationTimer);
  confirmation.value = text;
  confirmationTimer = setTimeout(() => (confirmation.value = ""), CONFIRMATION_MS);
}

// A draft opened from Approvals keeps Approvals as its way back (crumbs and back); from anywhere else, the Inbox.
const fromApprovals = computed(() => route.query?.from === FROM_APPROVALS);
const approvalsCrumbs = computed(() =>
  fromApprovals.value
    ? [
        { label: t("panels.leads"), to: { name: "LeadsToday" } },
        { label: t("leads.approvals.title"), to: { name: "LeadsApprovals" } },
        { label: t("leads.review.title") },
      ]
    : undefined
);

function goInbox() {
  router.replace({ name: fromApprovals.value ? "LeadsApprovals" : "LeadsInbox" });
}

// Runs one review call; a 409 is either "already handled" or a refused action (see onConflict).
async function act(call, after) {
  if (busy.value || !message.value) return;
  busy.value = true;
  try {
    const { data } = await call();
    reviewQueue.queueChanged();
    await after(data);
  } catch (err) {
    if (isConflict(err)) return await onConflict(err);
    notify.spawnNotification({ msg: t("leads.review.error"), type: "negative" });
  } finally {
    busy.value = false;
  }
}

// The 409 `error` code (communicator docs/api.md) decides: ALREADY_REVIEWED → someone else handled it, move on;
// any other conflict → the service refused the action, show its message and stay on the draft.
async function onConflict(err) {
  if (err.error !== "ALREADY_REVIEWED") {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.review.refused")), type: "negative" });
    return;
  }
  notify.spawnNotification({ msg: t("leads.review.conflict"), type: "warning" });
  reviewQueue.queueChanged();
  return goNext();
}

// The confirmation reads the same `next_slot` the Inbox and the waiting table read — one source for the slot.
// A failed list, or a mail it does not hold, is an unknown schedule — never "waiting for the send window".
async function acceptedState(accepted) {
  const waiting = await api.GET_WaitingMessages().catch(() => []);
  const mail = waiting.find((item) => item.id === accepted.id);
  if (!mail) return t("leads.send_state.unknown");
  const state = sendState(mail.next_slot);
  return state.state === "due" ? t("leads.review.goes_soon") : sendStateSentence(state);
}

// Send: the next draft opens at once; the line above it says when this mail goes.
function accept() {
  return act(
    () => api.POST_ReviewAccept(message.value.id),
    async (data) => {
      const [state] = await Promise.all([acceptedState(data), goNext(true)]);
      confirm(t("leads.review.accepted", { state }));
    }
  );
}

// Skip: this mail is not sent (a skipped follow-up lets the sequence write the next one when it is due).
function skip() {
  return act(
    () => api.POST_ReviewSkip(message.value.id),
    () => {
      confirm(t("leads.review.skipped"));
      return goNext(true);
    }
  );
}

function skipCompany() {
  return act(() => api.POST_ReviewSkipCompany(message.value.id), () => goNext());
}

// The action answers with the new version itself — show it directly (it may sit beyond the first review page);
// a failed rewrite stays on the reviewed draft with its reason.
function openVersion(data) {
  if (data.status === "failed") {
    failedVersion.value = data;
    return;
  }
  // the new version takes the old one's place in the Inbox order; the way back (Approvals) stays
  queue.value = queue.value.map((id) => (id === message.value.id ? data.id : id));
  message.value = data;
  loadOutbound();
  router.replace({ name: "LeadsReview", params: { id: data.id }, ...(fromApprovals.value && { query: route.query }) });
}

function openRewrite() {
  rewriteNotes.value = "";
  rewriteOpen.value = true;
}

// The rewrite dialog opens from a menu item that is gone once it closes: focus goes back to the more button (after
// the dialog's focus trap has let go).
const reviewActions = ref(null);
watch(rewriteOpen, (open) => open || nextTick(() => reviewActions.value?.focusMore()));

function retryRewrite() {
  failedVersion.value = null;
  openRewrite();
}

function rewrite(notes) {
  rewriteOpen.value = false;
  return act(() => api.POST_ReviewRewrite(message.value.id, { notes }), openVersion);
}

function startEdit() {
  draft.value = { subject: message.value.subject, body_text: message.value.body_text };
  editing.value = true;
}

async function cancelEdit() {
  if (await confirmDiscard()) editing.value = false;
}

function saveEdit() {
  return act(() => api.POST_ReviewEdit(message.value.id, draft.value), (data) => {
    editing.value = false;
    openVersion(data);
  });
}

watch(
  () => route.params.id,
  (id) => {
    if (!id) return;
    queueEmpty.value = false;
    failedVersion.value = null;
    editing.value = false;
    if (message.value?.id !== Number(id)) load();
  },
  { immediate: true }
);
onBeforeUnmount(() => clearTimeout(confirmationTimer));
</script>

<style scoped>
/* The draft moves sideways under a swipe; the page never scrolls sideways with it. */
.review__body {
  overflow-x: clip;
}
/* empty, the region is out of the flow (no gap) but still in the page for the screen reader */
.review__confirm {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  overflow: hidden;
  clip-path: inset(50%);
}
.review__confirm--shown {
  position: static;
  width: auto;
  height: auto;
  overflow: visible;
  clip-path: none;
  padding: var(--space-5) var(--space-8);
  border-radius: var(--radius-lg);
  background: var(--positive-subtle);
  color: var(--text-body);
  font-weight: 600;
}
.review__failed {
  padding: var(--space-8);
  border-radius: var(--radius-lg);
  background: var(--negative-subtle);
}
.review__failed-text {
  color: var(--text-body);
  overflow-wrap: anywhere;
}
.review__draft {
  touch-action: pan-y;
  transition: transform 0.1s ease;
}
.review__company {
  font-weight: 600;
  font-size: var(--fs-400);
  color: var(--text-body);
  overflow-wrap: anywhere;
}
.review__meta {
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.review__subject {
  margin-top: var(--space-5);
  overflow-wrap: anywhere;
}
.review__text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.5;
}
</style>
