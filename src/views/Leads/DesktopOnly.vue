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
    <router-link v-if="route.meta.desktopBack === 'LeadsDeals'" :to="{ name: 'LeadsDeals' }">{{ $t("leads.desktop_only.back_deals") }}</router-link>
    <router-link v-else :to="{ name: 'LeadsInbox' }">{{ $t("leads.desktop_only.back") }}</router-link>
  </EmptyState>
</template>

<script setup>
import { useRoute } from "vue-router";
import { useIsDesktop } from "@/composables/useIsDesktop";

// Below 1024 px a desktop screen says so and links back to the Inbox (the deal board: to the deal list, its phone
// screen) — never a broken layout.
const isDesktop = useIsDesktop();
const route = useRoute();
</script>
