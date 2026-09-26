<template>
  <div class="ld-page" data-testid="leads-settings">
    <router-link
      v-for="section in sections"
      :key="section.route"
      :to="{ name: section.route }"
      class="settings-row"
      :data-testid="`settings-${section.key}`"
    >
      <FontAwesomeIcon :icon="section.icon" class="settings-row__icon" />
      <span class="settings-row__label">{{ $t(section.labelKey) }}</span>
      <FontAwesomeIcon icon="chevron-right" class="settings-row__go" />
    </router-link>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useMuninStore } from "@/stores/munin";

// Leads → Settings (UX-002d): the configuration of both backends in one list. A section whose module is off is
// not listed — the backends stay separate (leads decides what and to whom, communicator how and when).
const SECTIONS = [
  { key: "stages", route: "LeadsStages", labelKey: "nav.leads_stages", icon: "list-ol", module: "leads" },
  { key: "lead-types", route: "LeadsLeadTypes", labelKey: "leads.lead_types.title", icon: "tags", module: "leads" },
  { key: "templates", route: "CommunicatorTemplates", labelKey: "nav.communicator_templates", icon: "file-lines", module: "communicator" },
  { key: "sequences", route: "CommunicatorSequences", labelKey: "nav.communicator_sequences", icon: "repeat", module: "communicator" },
  { key: "sending", route: "CommunicatorSettings", labelKey: "nav.communicator_settings", icon: "paper-plane", module: "communicator" },
];

const munin = useMuninStore();
const sections = computed(() => SECTIONS.filter((section) => munin.isModuleEnabled(section.module)));
</script>

<style scoped>
.ld-page {
  max-width: 720px;
}
.settings-row {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  min-height: 56px;
  padding: 0 var(--space-300);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
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
