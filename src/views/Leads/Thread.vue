<template>
  <div class="thread" data-testid="leads-thread">
    <BackBar class="thread__back" :label="$t('leads.thread.back')" @back="goBack" />
    <Loader v-show="loading" />
    <h3 v-if="company" class="thread__company" data-testid="thread-company">{{ company.name }}</h3>
    <ToolboxBanner v-if="company" />
    <IntelCard v-if="company && munin.isModuleEnabled('siteintel')" :context="company" />
    <p v-if="!loading && !thread" class="thread__none">{{ $t("leads.thread.no_thread") }}</p>
    <ThreadTimeline
      :messages="thread?.timeline || []"
      :activities="activities"
      :optouts="optouts"
      @confirm-optout="confirmOptout"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_Company, GET_CompanyActivities } from "@/api/leads/api";
import { GET_Replies, GET_Thread, GET_Threads, POST_ConfirmOptout } from "@/api/communicator/api";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";
import IntelCard from "./IntelCard.vue";
import ThreadTimeline from "./ThreadTimeline.vue";
import ToolboxBanner from "./ToolboxBanner.vue";

const route = useRoute();
const router = useRouter();
const munin = useMuninStore();
const notify = useNotifyStore();

const company = ref(null);
const thread = ref(null);
const activities = ref([]);
const optouts = ref([]);
const loading = ref(false);

// The company payload carries no threads: the newest thread of the subject (an older one left open must not
// hide the conversation that just got a reply).
async function loadThread(companyId) {
  const { data } = await GET_Threads({ subject_ref: `leads.Company:${companyId}` });
  const picked = [...(data.results || [])].sort((a, b) => b.id - a.id)[0];
  if (!picked) return null;
  const [detail, replies] = await Promise.all([
    GET_Thread(picked.id),
    GET_Replies({ thread: picked.id, kind: "suspected_optout" }),
  ]);
  optouts.value = replies.data.results || [];
  return detail.data;
}

async function load() {
  const id = route.params.id;
  loading.value = true;
  try {
    const [companyRes, activityRes, threadData] = await Promise.all([
      GET_Company(id),
      GET_CompanyActivities(id, { page_size: 100 }),
      loadThread(id),
    ]);
    company.value = companyRes.data;
    activities.value = activityRes.data.results || [];
    thread.value = threadData;
  } finally {
    loading.value = false;
  }
}

async function confirmOptout(replyId) {
  try {
    await POST_ConfirmOptout(replyId);
    await load();
  } catch {
    notify.spawnNotification({ msg: t("leads.review.error"), type: "negative" });
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
  gap: var(--space-200);
  padding: var(--space-300);
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
  color: var(--c-basic-500);
}
</style>
