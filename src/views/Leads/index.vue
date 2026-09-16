<template>
  <DesktopOnly v-if="route.meta?.desktop">
    <router-view />
  </DesktopOnly>
  <div v-else class="leads" :class="{ 'leads--detail': hasDetail, 'leads--solo': !hasInbox }" data-testid="leads-layout">
    <aside v-if="hasInbox" class="leads__inbox">
      <Inbox />
    </aside>
    <section v-if="hasDetail" class="leads__detail">
      <router-view />
    </section>
    <section v-else-if="reviewQueue.count" class="leads__placeholder">
      <p>{{ $t("leads.inbox.pick") }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { GET_Policy } from "@/api/communicator/api";
import { useLeadsReviewStore } from "@/stores/leadsReview";
import { useMuninStore } from "@/stores/munin";
import { applyPolicy } from "@/utils/leadsTime";
import DesktopOnly from "./DesktopOnly.vue";
import Inbox from "./Inbox.vue";

// Desktop-only screens (board, import, stages) take the full width.
// Mobile stacks the screens (Inbox, or the open draft/thread); >= 1024 px shows both as columns.
// The Inbox is communicator data — without that module the detail takes the whole width.
const route = useRoute();
const munin = useMuninStore();
const reviewQueue = useLeadsReviewStore();
const hasDetail = computed(() => route.name !== "LeadsInbox");
const hasInbox = computed(() => munin.isModuleEnabled("communicator"));

// Times read in the channel's zone (the send policy's); without it they stay in the browser's. The same
// answer says whether today's cap is used up — what a waiting mail needs before it names an hour.
onMounted(async () => {
  if (!hasInbox.value) return;
  try {
    applyPolicy((await GET_Policy()).data);
  } catch {
    applyPolicy(null);
  }
});
</script>

<style scoped>
/* The app content column clips (overflow: hidden) — the layout is its own scroller, so long threads
   and the Review edit form stay reachable and the sticky Review actions pin to its bottom. */
.leads {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  height: 100%;
  overflow-y: auto;
}
.leads__placeholder {
  display: none;
}
@media (max-width: 1023px) {
  .leads--detail .leads__inbox {
    display: none;
  }
}
@media (min-width: 1024px) {
  .leads {
    grid-template-columns: 360px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    overflow: hidden;
  }
  .leads--solo {
    grid-template-columns: minmax(0, 1fr);
  }
  .leads__inbox {
    border-right: 1px solid var(--c-basic-300);
  }
  .leads__inbox,
  .leads__detail {
    overflow-y: auto;
  }
  .leads__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--c-basic-500);
  }
}
</style>
