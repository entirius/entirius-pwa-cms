<template>
  <DesktopOnly v-if="route.meta?.desktop">
    <router-view />
  </DesktopOnly>
  <!-- Settings and its sections: full width, one scroller, usable on a phone (wide tables scroll in their box) -->
  <div v-else-if="route.meta?.page" class="leads-page h-100 ovy-auto" data-testid="leads-page">
    <router-view />
  </div>
  <div v-else class="leads" :class="{ 'leads--detail': hasDetail, 'leads--solo': !hasInbox, 'leads--focus': isFocus }" data-testid="leads-layout">
    <aside v-if="hasInbox" class="leads__inbox">
      <!-- Conversations | Companies: one nav entry, the toggle navigates between the two list routes -->
      <SegmentedControl
        v-if="hasCompanies"
        class="leads__toggle"
        :options="listOptions"
        :model-value="list"
        data-testid="leads-list-toggle"
        @update:model-value="openList"
      />
      <Inbox v-show="list === 'conversations'" />
      <Companies v-if="list === 'companies'" embedded />
    </aside>
    <section v-if="hasDetail" class="leads__detail">
      <router-view />
    </section>
    <section v-else-if="list === 'companies'" class="leads__placeholder">
      <p>{{ $t("leads.companies.pick") }}</p>
    </section>
    <section v-else-if="pickKey" class="leads__placeholder" data-testid="leads-detail-pick">
      <p>{{ $t(pickKey) }}</p>
    </section>
    <!-- desktop, empty queue: the right pane says why it is empty and where the work is -->
    <section v-else class="leads__placeholder" data-testid="leads-detail-empty">
      <EmptyState
        icon="empty"
        :title="$t('leads.inbox.detail_empty_title')"
        :message="$t('leads.inbox.detail_empty')"
      >
        <router-link
          v-if="isDesktop"
          class="leads__open-board t-accent"
          :to="{ name: 'LeadsBoard' }"
          data-testid="leads-open-board"
        >
          {{ $t("leads.inbox.open_board") }}
        </router-link>
      </EmptyState>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { GET_Policy } from "@/api/communicator/api";
import { useIsDesktop } from "@/composables/useIsDesktop";
import { AREAS } from "@/configs/areas";
import { useAccessStore } from "@/stores/access";
import { useApprovalsStore } from "@/stores/approvals";
import { useLeadsReviewStore } from "@/stores/leadsReview";
import { useLeadsThreadStore } from "@/stores/leadsThread";
import { useMuninStore } from "@/stores/munin";
import { t } from "@/i18n";
import { applyPolicy } from "@/utils/leadsTime";
import { outboundOn } from "@/utils/leadsOutbound";
import Companies from "./Companies.vue";
import DesktopOnly from "./DesktopOnly.vue";
import Inbox from "./Inbox.vue";

// Desktop-only screens (board, import, stages) take the full width.
// Mobile stacks the screens (Inbox, or the open draft/thread); >= 1024 px shows both as columns, a company card and a
// conversation only from 1440 px.
// The Inbox is communicator data — without that module the detail takes the whole width.
const route = useRoute();
const router = useRouter();
const munin = useMuninStore();
const reviewQueue = useLeadsReviewStore();
// k5 (walk 4): the empty detail pane speaks of the chip the column shows; Drafts asks for a draft only while any wait.
const PICK_KEYS = { all: "leads.inbox.pick_all", waiting: "leads.inbox.pick_waiting", replied: "leads.inbox.pick_replied" };
const threadColumn = useLeadsThreadStore();
const pickKey = computed(() => PICK_KEYS[threadColumn.inboxFilter] || (reviewQueue.count ? "leads.inbox.pick" : ""));
const isDesktop = useIsDesktop();
const hasInbox = computed(() => munin.isModuleEnabled("communicator"));
const hasCompanies = computed(() => munin.isModuleEnabled("leads"));

// The left column lists conversations or companies. The two list routes pick it; a card, a draft or a thread opened
// from a list keeps the list it came from, so the column never jumps. Without communicator there is no column: the
// company list is the detail, full width.
const LIST_ROUTES = { LeadsInbox: "conversations", LeadsCompanies: "companies" };
const list = ref(LIST_ROUTES[route.name] || "conversations");
watch(
  () => route.name,
  (name) => LIST_ROUTES[name] && (list.value = LIST_ROUTES[name])
);
const hasDetail = computed(() => !hasInbox.value || !LIST_ROUTES[route.name]);
// A company card and a conversation need the width: below 1440 px they hide the column (it stays mounted, so its chip
// and scroll survive); from 1440 px the column stays beside them.
const FOCUS_ROUTES = ["LeadsThread", "LeadsConversation"];
const isFocus = computed(() => FOCUS_ROUTES.includes(route.name));
const listOptions = computed(() => [
  { value: "conversations", label: t("leads.inbox.conversations"), testid: "leads-list-conversations" },
  { value: "companies", label: t("leads.companies.title"), testid: "leads-list-companies" },
]);
const openList = (value) => router.push({ name: value === "companies" ? "LeadsCompanies" : "LeadsInbox" });

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

// The Approvals nav badge: drafts of every channel, polled while the panel is open.
const approvals = useApprovalsStore();
const access = useAccessStore();
// munin and access may still be loading at mount (a hard refresh): start once both say yes.
watch(
  () => outboundOn(munin, "communicator") && access.can(AREAS.COMMUNICATOR_REVIEW),
  (on) => on && approvals.start(),
  { immediate: true }
);
onUnmounted(() => approvals.stop());
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
.leads__toggle {
  display: flex;
  height: 44px;
  margin: var(--space-8) var(--space-8) 0;
}
.leads__toggle :deep(.segmented-control__option) {
  flex: 1;
  font-size: var(--fs-300);
}
@media (max-width: 1023px) {
  .leads--detail .leads__inbox {
    display: none;
  }
  /* A phone shows the open screen alone at the height of the view: its PageLayout scrolls, so the Review actions in
     its footer stay pinned at the bottom (Review keeps the tab bar off, meta.noBottomBar). */
  .leads--detail {
    grid-template-rows: minmax(0, 1fr);
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
}
/* 1440 px has no breakpoint mixin: the range is written out (N21) */
@media (min-width: 1024px) and (max-width: 1439px) {
  .leads--focus {
    grid-template-columns: minmax(0, 1fr);
  }
  .leads--focus .leads__inbox {
    display: none;
  }
}
@media (min-width: 1024px) {
  .leads__inbox {
    border-right: 1px solid var(--border-subtle);
  }
  .leads__inbox,
  .leads__detail {
    overflow-y: auto;
  }
  .leads__placeholder {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    align-items: center;
    justify-content: center;
    padding: var(--space-10);
    color: var(--text-secondary);
    text-align: center;
  }
  .leads__placeholder p {
    margin: 0;
  }
  .leads__open-board {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    text-decoration: underline;
  }
}
</style>
