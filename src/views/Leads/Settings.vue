<template>
  <PageLayout data-testid="leads-settings">
    <template #header>
      <PageHeader :title="$t('nav.leads_settings')" />
    </template>
    <nav class="settings-list flex-column gap-3" :aria-label="$t('nav.leads_settings')">
      <router-link
        v-for="section in sections"
        :key="section.route"
        :to="{ name: section.route }"
        class="settings-row"
        :data-testid="`settings-${section.key}`"
      >
        <FontAwesomeIcon :icon="section.icon" class="settings-row__icon" />
        <span class="settings-row__label">{{ $t(section.labelKey) }}</span>
        <FontAwesomeIcon :icon="$icons.next" class="settings-row__go" />
      </router-link>
    </nav>
  </PageLayout>
</template>

<script setup>
import { computed } from "vue";
import { LEADS_SETTINGS_SECTIONS } from "@/components/Navigation/nav-routes";
import { useMuninStore } from "@/stores/munin";

// Leads → Settings (UX-002d): the configuration of both backends in one list. A section whose module is off is
// not listed — the backends stay separate (leads decides what and to whom, communicator how and when). The sections
// and their glyphs come from the nav model.

const munin = useMuninStore();
const sections = computed(() => LEADS_SETTINGS_SECTIONS.filter((section) => munin.isModuleEnabled(section.module)));
</script>

<style scoped>
.settings-list {
  max-width: 720px;
}
.settings-row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  min-height: 56px;
  padding: 0 var(--space-8);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface-base);
  color: var(--text-body);
  text-decoration: none;
}
.settings-row__icon {
  width: 1.25rem;
  color: var(--text-muted);
}
.settings-row__label {
  flex: 1;
  font-weight: 600;
}
.settings-row__go {
  color: var(--text-muted);
}
</style>
