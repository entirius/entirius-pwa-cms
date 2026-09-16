<template>
  <article class="tg" :class="{ 'tg--reply': holdsReply }" data-testid="earlier-thread">
    <button class="tg__head" :aria-expanded="String(open)" data-testid="earlier-thread-toggle" @click="toggle">
      <span class="tg__subject" data-testid="earlier-thread-subject">{{ title }}</span>
      <span class="tg__meta" data-testid="earlier-thread-to">{{ $t("leads.review.to") }}: {{ recipient }}</span>
      <span class="tg__meta">
        {{ $t(`leads.thread.state.${thread.status}`) }}<template v-if="thread.last_message_at">
          · {{ formatTime(thread.last_message_at) }}</template>
      </span>
      <span v-if="holdsReply" class="tg__reply" data-testid="earlier-thread-reply">{{ $t("leads.thread.earlier_reply") }}</span>
      <span v-if="pending" class="tg__badge" data-testid="earlier-thread-optout">{{ $t("leads.thread.optout_suspected") }}</span>
    </button>
    <Loader v-show="loading" />
    <ThreadTimeline
      v-if="open && detail"
      :messages="detail.timeline || []"
      :optouts="detail.optouts"
      :waiting="waiting"
      :busy="optoutBusy"
      @confirm-optout="confirmOptout"
    />
  </article>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import { GET_ThreadWithOptouts, POST_ConfirmOptout } from "@/api/communicator/api";
import { useNotifyStore } from "@/stores/notify";
import { threadSubject } from "@/utils/leadsThread";
import { formatTime } from "@/utils/leadsTime";
import ThreadTimeline from "./ThreadTimeline.vue";

// One older thread of the company, collapsed to its header. The conversation loads with the header: collapsed rows
// of the same company are told apart by their subject and recipient, not by opening them one by one.
const props = defineProps({
  thread: { type: Object, required: true },
  pending: { type: Boolean, default: false },
  waiting: { type: Array, default: () => [] },
  // the thread holding the reply the bell announced: opened and marked on arrival, never scrolled to — the newest
  // thread above stays on screen (FIX-17c item 5)
  holdsReply: { type: Boolean, default: false },
});
const emit = defineEmits(["changed"]);
const notify = useNotifyStore();

const open = ref(props.holdsReply);
const loading = ref(false);
const detail = ref(null);
const optoutBusy = ref(false);

const title = computed(
  () => threadSubject(detail.value?.timeline) || props.thread.recipient_name || props.thread.recipient_email
);
const recipient = computed(() =>
  [props.thread.recipient_name, props.thread.recipient_email].filter(Boolean).join(" · ")
);

async function loadDetail() {
  loading.value = true;
  try {
    detail.value = await GET_ThreadWithOptouts(props.thread.id);
  } finally {
    loading.value = false;
  }
}

function toggle() {
  open.value = !open.value;
}

onMounted(loadDetail);

async function confirmOptout(replyId) {
  if (optoutBusy.value) return;
  optoutBusy.value = true;
  try {
    await POST_ConfirmOptout(replyId);
    await loadDetail();
    emit("changed");
  } catch {
    notify.spawnNotification({ msg: t("leads.review.error"), type: "negative" });
  } finally {
    optoutBusy.value = false;
  }
}
</script>

<style scoped>
.tg {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  padding-top: var(--space-200);
  border-top: 1px solid var(--c-basic-300);
}
.tg__head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-100) var(--space-200);
  align-items: baseline;
  min-height: 44px;
  padding: 0;
  border: none;
  background: none;
  color: var(--c-basic-800);
  text-align: left;
  cursor: pointer;
}
.tg__subject {
  flex: 1 1 100%;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.tg__meta {
  font-size: var(--fs-100);
  color: var(--c-basic-600);
}
.tg--reply {
  border-top: 2px solid var(--c-support-400);
}
.tg__reply {
  font-size: var(--fs-100);
  font-weight: 600;
  color: var(--c-support-400);
}
.tg__badge {
  font-size: var(--fs-100);
  font-weight: 600;
  color: var(--c-negative-300);
}
</style>
