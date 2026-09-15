<template>
  <div class="review" data-testid="leads-review">
    <div class="review__scroll">
      <BackBar class="review__back" :label="$t('leads.review.back')" @back="goInbox" />
      <Loader v-show="loading" />

      <p v-if="scheduledLabel" class="review__scheduled" role="status" data-testid="review-scheduled">
        {{ scheduledLabel }}
      </p>

      <ToolboxBanner />

      <div v-if="failedVersion" class="review__failed" role="alert" data-testid="review-failed">
        <p class="review__failed-text">
          {{ $t("leads.review.rewrite_failed", { reason: failedVersion.failure_detail || failedVersion.failure_code }) }}
        </p>
        <div class="review__edit-actions">
          <button class="review__btn" data-testid="failed-back" @click="failedVersion = null">{{ $t("leads.review.cancel") }}</button>
          <button class="review__btn review__btn--primary" data-testid="failed-retry" @click="retryRewrite">
            {{ $t("leads.review.retry") }}
          </button>
        </div>
      </div>

      <article
        v-else-if="message && !scheduledLabel"
        class="review__draft"
        :style="{ transform: `translateX(${offset}px)` }"
        data-testid="review-draft"
        v-on="editing ? {} : handlers"
      >
        <header class="review__head">
          <router-link v-if="companyId" :to="{ name: 'LeadsThread', params: { id: companyId } }" class="review__company">
            {{ companyName }}
          </router-link>
          <span v-else class="review__company">{{ companyName }}</span>
          <span class="review__to">{{ $t("leads.review.to") }}: {{ message.thread?.recipient_email }}</span>
        </header>

        <IntelCard v-if="munin.isModuleEnabled('siteintel')" :context="message.render_context" />

        <template v-if="editing">
          <label class="review__label">{{ $t("leads.review.subject") }}
            <input v-model="draft.subject" class="review__input" data-testid="edit-subject" />
          </label>
          <label class="review__label">{{ $t("leads.review.body") }}
            <textarea v-model="draft.body_text" class="review__input" rows="12" data-testid="edit-body"></textarea>
          </label>
          <div class="review__edit-actions">
            <button class="review__btn" data-testid="edit-cancel" @click="cancelEdit">{{ $t("leads.review.cancel") }}</button>
            <button class="review__btn review__btn--primary" :disabled="busy" data-testid="edit-save" @click="saveEdit">{{ $t("leads.review.save") }}</button>
          </div>
        </template>
        <template v-else>
          <h3 class="review__subject" data-testid="review-subject">{{ message.subject }}</h3>
          <p class="review__body" data-testid="review-body">{{ message.body_text }}</p>
          <p class="review__hint">{{ $t("leads.review.swipe_hint") }}</p>
        </template>
      </article>
    </div>

    <ReviewActions
      v-if="message && !editing && !scheduledLabel && !failedVersion"
      :busy="busy"
      :ai-disabled="aiDisabled"
      @send="accept"
      @skip="skip"
      @rewrite="rewriteOpen = true"
      @edit="startEdit"
      @skip-company="skipCompany"
    />
    <RewriteModal v-if="rewriteOpen" @submit="rewrite" @close="rewriteOpen = false" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { isConflict } from "@/api/createClient";
import * as api from "@/api/communicator/api";
import { useLeadsReviewStore } from "@/stores/leadsReview";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";
import { useSwipe } from "@/composables/useSwipe";
import { companyIdFromSubjectRef } from "@/utils/subjectRef";
import { formatTime } from "@/utils/leadsTime";
import IntelCard from "./IntelCard.vue";
import ReviewActions from "./ReviewActions.vue";
import RewriteModal from "./RewriteModal.vue";
import ToolboxBanner from "./ToolboxBanner.vue";

const SCHEDULED_MS = 2000;

const route = useRoute();
const router = useRouter();
const munin = useMuninStore();
const notify = useNotifyStore();
const reviewQueue = useLeadsReviewStore();

const message = ref(null);
const loading = ref(false);
const busy = ref(false);
const editing = ref(false);
const rewriteOpen = ref(false);
const scheduledLabel = ref("");
const failedVersion = ref(null);
const draft = ref({ subject: "", body_text: "" });
let nextTimer = null;

const { offset, handlers } = useSwipe({ onRight: accept, onLeft: skip });

const companyId = computed(() => companyIdFromSubjectRef(message.value?.thread?.subject_ref));
const companyName = computed(
  () => message.value?.render_context?.company_name || message.value?.thread?.recipient_name || ""
);
const aiDisabled = computed(() => munin.toolboxStatus === "unconfigured");
const unsaved = computed(
  () => editing.value && (draft.value.subject !== message.value?.subject || draft.value.body_text !== message.value?.body_text)
);

// Leaving Edit (Cancel, Inbox, another draft) with unsaved changes asks first.
const confirmDiscard = () => !unsaved.value || window.confirm(t("leads.review.discard_confirm"));
onBeforeRouteLeave(confirmDiscard);
onBeforeRouteUpdate(confirmDiscard);

async function load() {
  loading.value = true;
  try {
    message.value = await api.GET_ReviewMessage(route.params.id);
    if (!message.value) await goNext();
  } finally {
    loading.value = false;
  }
}

async function goNext() {
  try {
    const { data } = await api.GET_ReviewNext();
    router.replace({ name: "LeadsReview", params: { id: data.id } });
  } catch {
    goInbox();
  }
}

function goInbox() {
  router.replace({ name: "LeadsInbox" });
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
    if (isConflict(err)) return await onConflict();
    notify.spawnNotification({ msg: t("leads.review.error"), type: "negative" });
  } finally {
    busy.value = false;
  }
}

// The service's 409 body is the same generic error for both cases, so the draft's state decides: gone from the
// queue → someone else handled it, move on; still waiting → the action does not apply to it, stay on the draft.
async function onConflict() {
  if (await api.GET_ReviewMessage(message.value.id)) {
    notify.spawnNotification({ msg: t("leads.review.refused"), type: "negative" });
    return;
  }
  notify.spawnNotification({ msg: t("leads.review.conflict"), type: "warning" });
  reviewQueue.queueChanged();
  return goNext();
}

function accept() {
  return act(
    () => api.POST_ReviewAccept(message.value.id),
    (data) => {
      const time = formatTime(data.scheduled_at);
      scheduledLabel.value = time ? t("leads.review.scheduled", { time }) : t("leads.review.sent_now");
      nextTimer = setTimeout(goNext, SCHEDULED_MS);
    }
  );
}

function skip() {
  return act(() => api.POST_ReviewSkip(message.value.id), goNext);
}

function skipCompany() {
  return act(() => api.POST_ReviewSkipCompany(message.value.id), goNext);
}

// The action answers with the new version itself — show it directly (it may sit beyond the first review page);
// a failed rewrite stays on the reviewed draft with its reason.
function openVersion(data) {
  if (data.status === "failed") {
    failedVersion.value = data;
    return;
  }
  message.value = data;
  router.replace({ name: "LeadsReview", params: { id: data.id } });
}

function retryRewrite() {
  failedVersion.value = null;
  rewriteOpen.value = true;
}

function rewrite(notes) {
  rewriteOpen.value = false;
  return act(() => api.POST_ReviewRewrite(message.value.id, { notes }), openVersion);
}

function startEdit() {
  draft.value = { subject: message.value.subject, body_text: message.value.body_text };
  editing.value = true;
}

function cancelEdit() {
  if (confirmDiscard()) editing.value = false;
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
    clearTimeout(nextTimer);
    scheduledLabel.value = "";
    failedVersion.value = null;
    editing.value = false;
    if (message.value?.id !== Number(id)) load();
  },
  { immediate: true }
);
onBeforeUnmount(() => clearTimeout(nextTimer));
</script>

<style scoped>
.review {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.review__scroll {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  padding: var(--space-300);
  overflow-x: hidden;
}
.review__back {
  align-self: flex-start;
  min-height: 44px;
}
.review__scheduled {
  margin: var(--space-400) 0;
  padding: var(--space-300);
  border-radius: 8px;
  background: var(--c-positive-100);
  color: var(--c-basic-800);
  font-size: var(--fs-400);
  font-weight: 600;
  text-align: center;
}
.review__failed {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  padding: var(--space-300);
  border-radius: 8px;
  background: var(--c-negative-100);
}
.review__failed-text {
  margin: 0;
  color: var(--c-basic-800);
  overflow-wrap: anywhere;
}
.review__draft {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  touch-action: pan-y;
  transition: transform 0.1s ease;
}
.review__head {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.review__company {
  font-weight: 600;
  font-size: var(--fs-400);
  color: var(--c-basic-800);
  overflow-wrap: anywhere;
}
.review__to {
  color: var(--c-basic-600);
  overflow-wrap: anywhere;
}
.review__subject {
  margin: var(--space-200) 0 0;
  font-size: var(--fs-400);
  overflow-wrap: anywhere;
}
.review__body {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.5;
}
.review__hint {
  margin: 0;
  font-size: var(--fs-100);
  color: var(--c-basic-500);
}
.review__label {
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
  font-weight: 600;
}
.review__input {
  box-sizing: border-box;
  width: 100%;
  padding: var(--space-200);
  border: 1px solid var(--c-basic-300);
  border-radius: 8px;
  font: inherit;
  font-weight: 400;
}
.review__edit-actions {
  display: flex;
  gap: var(--space-200);
}
.review__btn {
  flex: 1;
  min-height: 48px;
  border: 1px solid var(--c-basic-300);
  border-radius: 8px;
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  font-weight: 600;
  cursor: pointer;
}
.review__btn--primary {
  border-color: var(--c-support-400);
  background: var(--c-support-400);
  color: var(--c-basic-100);
}
</style>
