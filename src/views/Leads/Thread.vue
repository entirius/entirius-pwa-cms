<template>
  <div class="thread" data-testid="leads-thread">
    <BackBar v-if="desktopHint" class="thread__back" :label="$t('leads.thread.back')" @back="goBack" />
    <Loader v-show="loading" />
    <h3 v-if="company && desktopHint" class="thread__company" data-testid="thread-company">{{ company.name }}</h3>
    <p v-if="companyMissing" class="thread__none" role="status" data-testid="thread-company-missing">
      {{ $t("leads.thread.company_unavailable") }}
    </p>
    <p v-if="desktopHint" class="thread__none" data-testid="thread-desktop-hint">{{ $t("leads.thread.desktop_hint") }}</p>
    <ConfigBanner v-if="company" code="toolbox.status" />
    <IntelCard v-if="company && munin.isModuleEnabled('siteintel')" :context="company" />
    <p v-if="mailMissing" class="thread__none" role="status" data-testid="thread-mail-missing">
      {{ $t("leads.thread.mail_unavailable") }}
    </p>
    <p v-else-if="!loading && !newest" class="thread__none">{{ $t("leads.thread.no_thread") }}</p>
    <p v-if="newest" class="thread__subject" data-testid="thread-subject">
      <strong>{{ threadSubject(newest.timeline) }}</strong>
      <span class="thread__state"> · {{ $t(`leads.thread.state.${newest.status}`) }}</span>
    </p>
    <p v-if="replyThreadId" class="thread__none" data-testid="thread-reply-below">{{ $t("leads.thread.reply_below") }}</p>
    <ThreadTimeline
      v-if="!mailMissing && !loading"
      :busy="optoutBusy"
      :messages="newest?.timeline || []"
      :optouts="newest?.optouts || []"
      :waiting="newest ? waitingOf(waiting, newest.id) : []"
      @confirm-optout="confirmOptout"
    />
    <EarlierThreads
      v-if="older.count"
      :key="subjectRef"
      :subject-ref="subjectRef"
      :threads="older.threads"
      :count="older.count"
      :next="older.next"
      :page-size="PAGE_SIZE"
      :pending-threads="pendingThreads"
      :waiting="waiting"
      :open-thread-id="replyThreadId"
      @changed="loadPendingOptouts"
    />
    <details v-if="desktopHint && activities.length" class="thread__activity" data-testid="thread-activity">
      <summary>{{ $t("leads.thread.activity", { count: activities.length }) }}</summary>
      <ul>
        <li v-for="activity in activities" :key="activity.id">
        {{ formatTime(activity.created_at) }} · {{ activityText(activity.message) }}
      </li>
      </ul>
    </details>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_Company, GET_CompanyActivities } from "@/api/leads/api";
import {
  GET_Replies,
  GET_ThreadWithOptouts,
  GET_Threads,
  GET_WaitingMessages,
  POST_ConfirmOptout,
} from "@/api/communicator/api";
import { useMuninStore } from "@/stores/munin";
import { useLeadsThreadStore } from "@/stores/leadsThread";
import { useNotifyStore } from "@/stores/notify";
import { activityText } from "@/utils/leadsLabels";
import { threadSubject, waitingOf } from "@/utils/leadsThread";
import { formatTime } from "@/utils/leadsTime";
import ConfigBanner from "@/components/ConfigHealth/ConfigBanner.vue";
import EarlierThreads from "./EarlierThreads.vue";
import IntelCard from "./IntelCard.vue";
import ThreadTimeline from "./ThreadTimeline.vue";

// The company thread: the newest conversation (closed or not); older ones sit behind one expander.
// On a phone this is the whole company card — its activity log stays apart from the mail, collapsed below.
const props = defineProps({ desktopHint: { type: Boolean, default: false } });
const PAGE_SIZE = 20;

const route = useRoute();
const router = useRouter();
const munin = useMuninStore();
const notify = useNotifyStore();

const company = ref(null);
const newest = ref(null);
const shownThread = useLeadsThreadStore();
const older = ref({ threads: [], count: 0, next: false });
const pendingOptouts = ref([]);
const waiting = ref([]);
const activities = ref([]);
const loading = ref(true);
const companyMissing = ref(false);
const mailMissing = ref(false);
const optoutBusy = ref(false);

const subjectRef = computed(() => `leads.Company:${route.params.id}`);
const pendingThreads = computed(
  () => new Set(pendingOptouts.value.filter((reply) => !reply.optout_confirmed_at).map((reply) => reply.thread_id))
);

// A reply that landed before our newest mail sits in an older thread (plan 13 decision c keeps the structure).
// The card opens that thread itself, so the bell never lands on a screen holding only our own mail.
const replyThreadId = computed(() => {
  if (!newest.value || newest.value.timeline?.some((entry) => entry.direction === "in")) return null;
  return older.value.threads.find((thread) => thread.status === "replied")?.id || null;
});

async function loadThreads() {
  shownThread.shownId = null; // another company: no stale row stays marked while this one loads
  const { data } = await GET_Threads({ subject_ref: subjectRef.value, page_size: PAGE_SIZE });
  const [first, ...rest] = data.results || [];
  older.value = { threads: rest, count: Math.max((data.count || 0) - 1, 0), next: Boolean(data.next) };
  newest.value = first ? await GET_ThreadWithOptouts(first.id) : null;
  shownThread.shownId = newest.value?.id ?? null;
}

async function loadPendingOptouts() {
  const { data } = await GET_Replies({ kind: "suspected_optout", page_size: 100 });
  pendingOptouts.value = data.results || [];
}

async function loadActivities(id) {
  if (!props.desktopHint) return;
  activities.value = (await GET_CompanyActivities(id, { page_size: 100 })).data.results || [];
}

async function loadCompany(id) {
  company.value = (await GET_Company(id)).data;
}

// The mail side needs the communicator module; without it (or when it fails) the company still renders.
async function loadMail() {
  if (!munin.isModuleEnabled("communicator")) throw new Error("communicator module disabled");
  const [waitingList] = await Promise.all([GET_WaitingMessages(), loadThreads(), loadPendingOptouts()]);
  waiting.value = waitingList;
}

async function load() {
  const id = route.params.id;
  loading.value = true;
  try {
    const [companyResult, mailResult] = await Promise.allSettled([loadCompany(id), loadMail(), loadActivities(id)]);
    companyMissing.value = companyResult.status === "rejected";
    mailMissing.value = mailResult.status === "rejected";
  } finally {
    loading.value = false;
  }
}

async function confirmOptout(replyId) {
  if (optoutBusy.value) return;
  optoutBusy.value = true;
  try {
    await POST_ConfirmOptout(replyId);
    await load();
  } catch {
    notify.spawnNotification({ msg: t("leads.review.error"), type: "negative" });
  } finally {
    optoutBusy.value = false;
  }
}

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push({ name: "LeadsInbox" });
}

onMounted(load);
watch(() => route.params.id, (id) => id && load());
</script>

<style scoped>
.thread {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-8);
  overflow-x: hidden;
}
.thread__back {
  align-self: flex-start;
  min-height: 44px;
}
.thread__company {
  margin: 0;
  font-size: var(--fs-400);
  overflow-wrap: anywhere;
}
.thread__none {
  margin: 0;
  color: var(--text-muted);
}
.thread__subject {
  margin: 0;
  overflow-wrap: anywhere;
}
.thread__state {
  color: var(--text-secondary);
  font-size: var(--fs-100);
}
.thread__activity {
  color: var(--text-secondary);
  font-size: var(--fs-100);
}
.thread__activity summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.thread__activity ul {
  margin: 0;
  padding-left: var(--space-4);
}
</style>
