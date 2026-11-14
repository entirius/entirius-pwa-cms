<template>
  <PageLayout data-testid="leads-conversation">
    <template #header>
      <!-- headed by its company, else the other side's address; below 1440 px it stands alone: back to the list -->
      <PageHeader :title="heading" wrap-title :back="goBack" />
    </template>
    <div class="conversation flex-column gap-4">
      <Loader block v-show="loading" />
      <p v-if="missing" class="t-muted m-0" role="status" data-testid="conversation-missing">
        {{ $t("leads.thread.mail_unavailable") }}
      </p>
      <template v-if="thread">
        <!-- k11 (walk 4): without a company the heading is the other side already — the address stands once -->
        <h2 v-if="companyName" class="conversation__wrap fs-400 fw-600 m-0" data-testid="conversation-recipient">{{ recipient }}</h2>
        <router-link v-if="companyRoute" class="conversation__wrap t-accent" :to="companyRoute" data-testid="conversation-company">
          {{ $t("leads.thread.open_company", { name: companyName }) }}
        </router-link>
        <p class="conversation__wrap m-0" data-testid="thread-subject">
          <strong>{{ threadSubject(thread.timeline) }}</strong>
          <StatusBadge class="conversation__state" size="sm" :tone="threadTone(thread.status)" :label="$t(`leads.thread.state.${thread.status}`)" data-testid="thread-state" />
        </p>
        <ThreadTimeline
          :company="replyCompany"
          :thread-id="thread.id"
          :contact="recipient"
          :busy="optoutBusy"
          :messages="thread.timeline || []"
          :optouts="thread.optouts || []"
          :waiting="waitingOf(waiting, thread.id)"
          @confirm-optout="confirmOptout"
          @dismiss-optout="dismissOptout"
          @sent="load"
        />
      </template>
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_ThreadWithOptouts, GET_WaitingMessages, POST_ConfirmOptout, POST_DismissOptout } from "@/api/communicator/api";
import { GET_Company } from "@/api/leads/api";
import { useNotifyStore } from "@/stores/notify";
import { useMuninStore } from "@/stores/munin";
import { threadTone } from "@/utils/leadsLabels";
import { outboundOn } from "@/utils/leadsOutbound";
import { threadSubject, waitingOf } from "@/utils/leadsThread";
import { companyIdFromSubjectRef, routeForSubjectRef } from "@/utils/subjectRef";
import ThreadTimeline from "./ThreadTimeline.vue";

// One thread by id — the screen of a conversation that belongs to no company, so every reply has a place.
const route = useRoute();
const router = useRouter();
const notify = useNotifyStore();
const munin = useMuninStore();

const thread = ref(null);
const waiting = ref([]);
const loading = ref(true);
const missing = ref(false);
const optoutBusy = ref(false);

// A conversation of a company names it and links to its card; Reply needs the company's contacts (CRM on).
const company = ref(null);
const companyName = computed(() => company.value?.name || thread.value?.subject_label || "");
const companyRoute = computed(() => {
  const ref = thread.value?.subject_ref;
  return companyName.value && companyIdFromSubjectRef(ref) ? routeForSubjectRef(ref) : null;
});
const heading = computed(() => companyName.value || recipient.value || t("leads.thread.conversation"));
const replyCompany = computed(() => (outboundOn(munin, "leads") && outboundOn(munin, "communicator") ? company.value : null));

async function loadCompany() {
  const id = munin.isModuleEnabled("leads") && companyIdFromSubjectRef(thread.value?.subject_ref);
  try {
    company.value = id ? (await GET_Company(id)).data : null;
  } catch {
    company.value = null;
  }
}

const recipient = computed(() =>
  [thread.value?.recipient_name, thread.value?.recipient_email].filter(Boolean).join(" · ")
);

async function load() {
  loading.value = true;
  try {
    const [detail, mails] = await Promise.all([GET_ThreadWithOptouts(route.params.id), GET_WaitingMessages()]);
    thread.value = detail;
    waiting.value = mails;
    missing.value = false;
    await loadCompany();
  } catch {
    thread.value = null;
    missing.value = true;
  } finally {
    loading.value = false;
  }
}

const confirmOptout = (replyId) => decideOptout(() => POST_ConfirmOptout(replyId), t("leads.thread.optout_done", { contact: recipient.value }));
const dismissOptout = (replyId) => decideOptout(() => POST_DismissOptout(replyId), t("leads.thread.optout_dismissed"));

// Confirm or dismiss a possible opt-out, then reload like the other reply actions.
async function decideOptout(post, message) {
  if (optoutBusy.value) return;
  optoutBusy.value = true;
  try {
    await post();
    notify.spawnNotification({ msg: message });
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
watch(() => route.params.id, (id) => id && route.name === "LeadsConversation" && load());
</script>

<style scoped>
.conversation {
  overflow-x: clip;
}
.conversation__state {
  margin-left: var(--space-2);
}
.conversation__wrap {
  overflow-wrap: anywhere;
}
</style>
