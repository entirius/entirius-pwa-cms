<template>
  <article class="tg" data-testid="earlier-thread">
    <button class="tg__head" :aria-expanded="String(open)" data-testid="earlier-thread-toggle" @click="toggle">
      <span class="tg__subject" data-testid="earlier-thread-subject">{{ title }}</span>
      <span class="tg__meta">
        {{ $t(`leads.thread.state.${thread.status}`) }} · {{ formatDateTime(thread.last_message_at) }}
      </span>
      <span v-if="pending" class="tg__badge" data-testid="earlier-thread-optout">{{ $t("leads.thread.optout_suspected") }}</span>
    </button>
    <Loader v-show="loading" />
    <ThreadTimeline
      v-if="open && detail"
      :messages="detail.timeline || []"
      :optouts="detail.optouts"
      :waiting="waiting"
      @confirm-optout="confirmOptout"
    />
  </article>
</template>

<script setup>
import { computed, ref } from "vue";
import { t } from "@/i18n";
import { GET_ThreadWithOptouts, POST_ConfirmOptout } from "@/api/communicator/api";
import { useNotifyStore } from "@/stores/notify";
import { threadSubject } from "@/utils/leadsThread";
import { formatDateTime } from "@/utils/leadsTime";
import ThreadTimeline from "./ThreadTimeline.vue";

// One older thread of the company, collapsed to its header; the conversation loads when opened.
const props = defineProps({
  thread: { type: Object, required: true },
  pending: { type: Boolean, default: false },
  waiting: { type: Array, default: () => [] },
});
const emit = defineEmits(["changed"]);
const notify = useNotifyStore();

const open = ref(false);
const loading = ref(false);
const detail = ref(null);

const title = computed(
  () => threadSubject(detail.value?.timeline) || props.thread.recipient_name || props.thread.recipient_email
);

async function loadDetail() {
  loading.value = true;
  try {
    detail.value = await GET_ThreadWithOptouts(props.thread.id);
  } finally {
    loading.value = false;
  }
}

async function toggle() {
  open.value = !open.value;
  if (open.value && !detail.value) await loadDetail();
}

async function confirmOptout(replyId) {
  try {
    await POST_ConfirmOptout(replyId);
    await loadDetail();
    emit("changed");
  } catch {
    notify.spawnNotification({ msg: t("leads.review.error"), type: "negative" });
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
.tg__badge {
  font-size: var(--fs-100);
  font-weight: 600;
  color: var(--c-negative-300);
}
</style>
