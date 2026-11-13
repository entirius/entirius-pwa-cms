<template>
  <PageLayout data-testid="leads-settings">
    <template #header>
      <PageHeader :title="$t('nav.leads_settings')" />
    </template>
    <nav class="settings-groups" :aria-label="$t('nav.leads_settings')">
      <BasicCard
        v-for="group in groups"
        :key="group.key"
        :title="$t(`leads.settings.groups.${group.key}`)"
        :data-testid="`settings-group-${group.key}`"
      >
        <div class="flex-column gap-3">
          <router-link
            v-for="section in group.sections"
            :key="section.route"
            :to="{ name: section.route }"
            class="settings-row"
            :data-testid="`settings-${section.key}`"
          >
            <FontAwesomeIcon :icon="section.icon" class="settings-row__icon" />
            <span class="settings-row__text flex-column">
              <span class="settings-row__label">{{ $t(section.labelKey) }}</span>
              <span class="t-secondary fs-200" data-testid="settings-section-about">{{ $t(`leads.settings.about.${section.key}`) }}</span>
            </span>
            <FontAwesomeIcon :icon="$icons.next" class="settings-row__go" />
          </router-link>
        </div>
      </BasicCard>
    </nav>
    <EmptyState v-if="!groups.length" icon="empty" :title="$t('leads.settings.none')" />
  </PageLayout>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { LEADS_SETTINGS_GROUPS, LEADS_SETTINGS_SECTIONS } from "@/components/Navigation/nav-routes";
import { useMuninStore } from "@/stores/munin";
import { useAccessStore } from "@/stores/access";

// Leads → Settings (UX-002d): the configuration of both backends in one list. A section whose module is off is
// not listed — the backends stay separate (leads decides what and to whom, communicator how and when). The sections
// and their glyphs come from the nav model. A section whose area (its route's `meta.area`) the user cannot read is not
// listed either: the guard would refuse it, and neither is one that needs a newer backend (`minVersion`). The sections
// sit in one card per group; each says in one line what it changes.

const munin = useMuninStore();
const access = useAccessStore();
const router = useRouter();
const readable = (section) => access.can(router.resolve({ name: section.route }).meta.area);
const present = (section) =>
  munin.isModuleEnabled(section.module) && (!section.minVersion || munin.isModuleAtLeast(section.module, section.minVersion));
const sections = computed(() => LEADS_SETTINGS_SECTIONS.filter((section) => present(section) && readable(section)));
// One card per group (Sales process · Automation · Sending); a group with no visible section is not rendered.
const groups = computed(() =>
  LEADS_SETTINGS_GROUPS.map((key) => ({ key, sections: sections.value.filter((section) => section.group === key) })).filter(
    (group) => group.sections.length
  )
);
</script>

<style scoped>
.settings-groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-8);
  align-items: start;
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
.settings-row__text {
  flex: 1;
  gap: var(--space-1);
  padding: var(--space-3) 0;
}
.settings-row__label {
  font-weight: 600;
}
.settings-row__go {
  color: var(--text-muted);
}
</style>
