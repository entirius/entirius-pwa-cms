<template>
  <section class="earlier" data-testid="earlier-threads">
    <button class="earlier__toggle" :aria-expanded="String(open)" data-testid="earlier-toggle" @click="open = !open">
      <span>{{ $t("leads.thread.earlier", { count }) }}</span>
      <span v-if="pendingCount" class="earlier__badge" data-testid="earlier-optout-badge">
        {{ $t("leads.thread.earlier_optout", { count: pendingCount }) }}
      </span>
      <FontAwesomeIcon :icon="open ? 'chevron-up' : 'chevron-down'" />
    </button>
    <div v-if="open" class="earlier__list">
      <ThreadGroup
        v-for="thread in allThreads"
        :key="thread.id"
        :thread="thread"
        :pending="pendingThreads.has(thread.id)"
        :waiting="waitingOf(waiting, thread.id)"
        @changed="$emit('changed')"
      />
      <button v-if="hasMore" class="earlier__more" :disabled="loading" data-testid="earlier-more" @click="loadMore">
        {{ $t("leads.thread.earlier_more") }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";
import { GET_Threads } from "@/api/communicator/api";
import { waitingOf } from "@/utils/leadsThread";
import ThreadGroup from "./ThreadGroup.vue";

// Every thread older than the newest one, behind one expander; further pages load like the list.
const props = defineProps({
  subjectRef: { type: String, required: true },
  threads: { type: Array, default: () => [] }, // older threads of the first list page
  count: { type: Number, default: 0 },
  next: { type: Boolean, default: false },
  pageSize: { type: Number, required: true },
  pendingThreads: { type: Set, default: () => new Set() }, // thread ids with an undecided opt-out
  waiting: { type: Array, default: () => [] },
});
defineEmits(["changed"]);

const open = ref(false);
const loading = ref(false);
const extra = ref([]);
const page = ref(1);
const extraNext = ref(null);

const allThreads = computed(() => [...props.threads, ...extra.value]);
const hasMore = computed(() => (extraNext.value === null ? props.next : extraNext.value));
const pendingCount = computed(() => allThreads.value.filter((thread) => props.pendingThreads.has(thread.id)).length);

async function loadMore() {
  loading.value = true;
  try {
    const params = { subject_ref: props.subjectRef, page: page.value + 1, page_size: props.pageSize };
    const { data } = await GET_Threads(params);
    extra.value = [...extra.value, ...(data.results || [])];
    extraNext.value = Boolean(data.next);
    page.value += 1;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.earlier {
  border: 1px solid var(--c-basic-300);
  border-radius: 8px;
  background: var(--c-basic-100);
}
.earlier__toggle {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-200);
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 0 var(--space-300);
  border: none;
  background: none;
  color: var(--c-basic-800);
  font-weight: 600;
  cursor: pointer;
}
.earlier__toggle > :first-child {
  flex: 1;
  text-align: left;
}
.earlier__badge {
  color: var(--c-negative-300);
  font-size: var(--fs-100);
}
.earlier__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  padding: 0 var(--space-300) var(--space-300);
}
.earlier__more {
  min-height: 44px;
  border: 1px solid var(--c-basic-300);
  border-radius: 8px;
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  cursor: pointer;
}
</style>
