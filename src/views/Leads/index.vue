<template>
  <DesktopOnly v-if="route.meta?.desktop">
    <router-view />
  </DesktopOnly>
  <div v-else class="leads" :class="{ 'leads--detail': hasDetail }" data-testid="leads-layout">
    <aside class="leads__inbox">
      <Inbox />
    </aside>
    <section v-if="hasDetail" class="leads__detail">
      <router-view />
    </section>
    <section v-else class="leads__placeholder">
      <p>{{ $t("leads.inbox.pick") }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import DesktopOnly from "./DesktopOnly.vue";
import Inbox from "./Inbox.vue";

// Desktop-only screens (board, import, stages) take the full width.
// Mobile stacks the screens (Inbox, or the open draft/thread); >= 1024 px shows both as columns.
const route = useRoute();
const hasDetail = computed(() => route.name !== "LeadsInbox");
</script>

<style scoped>
.leads {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 100%;
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
  }
  .leads__inbox {
    border-right: 1px solid var(--c-basic-300);
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
