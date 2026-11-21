<template>
  <!-- the app content column clips (overflow: hidden): the screen's PageLayout is its one scroll box -->
  <div v-if="isDesktop" class="h-100" data-testid="desktop-page">
    <slot />
  </div>
  <EmptyState
    v-else
    icon="columns"
    :title="$t('leads.desktop_only.title')"
    :message="$t('leads.desktop_only.message')"
    data-testid="desktop-only"
  >
    <router-link :to="{ name: back.name }">{{ $t(back.labelKey) }}</router-link>
  </EmptyState>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useIsDesktop } from "@/composables/useIsDesktop";

// Below 1024 px a desktop screen says so and links back to the Inbox (the deal board: to the deal list, its phone
// screen) — never a broken layout.
const isDesktop = useIsDesktop();
const route = useRoute();
// A route may name its phone screen (`meta.desktopBack` = { name, labelKey }); else the Inbox.
const back = computed(() => route.meta.desktopBack || { name: "LeadsInbox", labelKey: "leads.desktop_only.back" });
</script>
