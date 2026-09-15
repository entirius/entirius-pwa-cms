<template>
  <div class="inbox" data-testid="leads-inbox">
    <p class="inbox__summary" data-testid="inbox-summary">
      <strong>{{ $t("leads.inbox.to_review", { count: drafts.length }) }}</strong>
      <span v-if="held" data-testid="inbox-held"> · {{ $t("leads.inbox.held") }}</span>
      <span v-else-if="nextAt"> · {{ $t("leads.inbox.next_at", { time: nextAt }) }}</span>
    </p>

    <Loader v-show="loading" />

    <EmptyState
      v-if="!loading && !drafts.length"
      icon="inbox"
      :title="$t('leads.inbox.empty_title')"
      :message="emptyMessage"
      data-testid="inbox-empty"
    >
      <button class="inbox__refresh" data-testid="inbox-refresh" @click="load">
        {{ $t("leads.inbox.refresh") }}
      </button>
    </EmptyState>

    <router-link
      v-for="draft in drafts"
      :key="draft.id"
      :to="{ name: 'LeadsReview', params: { id: draft.id } }"
      class="inbox-card"
      :class="{ 'inbox-card--active': String(draft.id) === String($route.params.id) }"
      data-testid="inbox-item"
    >
      <span class="inbox-card__company">{{ companyName(draft) }}</span>
      <span class="inbox-card__subject">{{ draft.subject || $t("leads.inbox.untitled") }}</span>
      <span class="inbox-card__age">{{ formatTime(draft.created_at) }}</span>
    </router-link>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { t } from "@/i18n";
import { GET_ReviewList } from "@/api/communicator/api";
import { formatTime, isOverdue } from "@/utils/leadsTime";

const route = useRoute();
const drafts = ref([]);
const waiting = ref([]);
const loading = ref(false);

const firstSlot = computed(() => waiting.value.map((m) => m.scheduled_at).filter(Boolean).sort()[0] || "");
const nextAt = computed(() => formatTime(firstSlot.value));
const held = computed(() => isOverdue(firstSlot.value));

const emptyMessage = computed(() =>
  !waiting.value.length
    ? t("leads.inbox.empty_message_none")
    : held.value
      ? t("leads.inbox.empty_message_held", { count: waiting.value.length })
      : t("leads.inbox.empty_message", { count: waiting.value.length, time: nextAt.value })
);

function companyName(draft) {
  return draft.render_context?.company_name || draft.thread?.recipient_name || draft.thread?.recipient_email;
}

async function listStatus(status) {
  const { data } = await GET_ReviewList({ status, page_size: 100 });
  return data.results || [];
}

async function load() {
  loading.value = true;
  try {
    const [review, approved, scheduled] = await Promise.all(
      ["review_required", "approved", "scheduled"].map(listStatus)
    );
    drafts.value = review;
    waiting.value = [...approved, ...scheduled];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
// Desktop keeps the Inbox column mounted while Review acts — refresh on every navigation.
watch(() => route.fullPath, load);

defineExpose({ load });
</script>

<style scoped>
.inbox {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  padding: var(--space-300);
}
.inbox__summary {
  margin: 0;
  color: var(--c-basic-600);
}
.inbox__refresh {
  min-height: 44px;
  padding: 0 var(--space-400);
  border: 1px solid var(--c-basic-300);
  border-radius: 8px;
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  cursor: pointer;
}
.inbox-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.15rem var(--space-200);
  min-height: 56px;
  padding: var(--space-200) var(--space-300);
  border: 1px solid var(--c-basic-300);
  border-radius: 8px;
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  text-decoration: none;
}
.inbox-card--active {
  border-color: var(--c-support-400);
}
.inbox-card__company {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.inbox-card__subject {
  grid-column: 1 / -1;
  color: var(--c-basic-600);
  overflow-wrap: anywhere;
}
.inbox-card__age {
  grid-row: 1;
  grid-column: 2;
  font-size: var(--fs-100);
  color: var(--c-basic-500);
}
</style>
