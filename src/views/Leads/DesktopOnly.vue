<template>
  <!-- the app content column clips (overflow: hidden): a desktop screen scrolls in its own box, one per layout -->
  <div v-if="isDesktop" class="desktop-page" data-testid="desktop-page">
    <slot />
  </div>
  <EmptyState
    v-else
    icon="columns"
    :title="$t('leads.desktop_only.title')"
    :message="$t('leads.desktop_only.message')"
    data-testid="desktop-only"
  >
    <router-link :to="{ name: 'LeadsInbox' }">{{ $t("leads.desktop_only.back") }}</router-link>
  </EmptyState>
</template>

<script setup>
import { useIsDesktop } from "@/composables/useIsDesktop";

// Below 1024 px a desktop screen says so and links back to the Inbox — never a broken layout.
const isDesktop = useIsDesktop();
</script>

<style lang="scss" src="./desktop.scss"></style>
