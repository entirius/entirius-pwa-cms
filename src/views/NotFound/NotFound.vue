<template>
  <EmptyState icon="empty" size="md" :title="$t('not_found.title')" data-testid="not-found">
    <router-link class="t-accent" :to="start.path" data-testid="not-found-start">{{ start.label }}</router-link>
  </EmptyState>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { panels } from "@/configs/access";

// An unknown address inside the shell: the H1 comes from the route, the way on from the panel the address names.
// The start of the panel the address belongs to (its root page by name, for /leads/…: Today), else Home.
const route = useRoute();
const router = useRouter();
const start = computed(() => {
  const panel = panels.find((candidate) => candidate.idx === route.meta.panel);
  if (!panel) return { path: "/", label: t("not_found.home") };
  const titleKey = router.resolve(panel.root).meta?.titleKey;
  return { path: panel.root, label: t("not_found.go_to", { page: t(titleKey || panel.labelKey) }) };
});
</script>
