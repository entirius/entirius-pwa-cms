<template>
  <BasicTabs
    :model-value="route.name"
    :options="options"
    :id-prefix="tabs.idPrefix"
    @update:model-value="(name) => router.push({ name })"
  />
</template>

<script setup>
// The sections of one screen as tabs, each its own route (Enricher → Review: Proposals | Runs), placed under the
// PageHeader: `tabs` { idPrefix, sections: [{ route, labelKey, badge?, testid }] } from nav-routes.js; the page wraps
// its body in `routeTabPanel(tabs, <its route name>)`. A section whose area (its route's `meta.area`) the user cannot
// read is left out, as on Leads → Settings — the page's own tab always stays; a `badge` takes its number from the
// nav counts; one with `requiresModule` / `minVersion` appears when the backend module has that version.
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import BasicTabs from "@/boots/BasicTabs/index.vue";
import { useNavCounts } from "@/composables/useNav";
import { useAccessStore } from "@/stores/access";
import { useMuninStore } from "@/stores/munin";
import { t } from "@/i18n";

const props = defineProps({
  tabs: { type: Object, required: true },
});

const route = useRoute();
const router = useRouter();
const access = useAccessStore();
const counts = useNavCounts();

// `requiresModule` (+ `minVersion`): the section needs that backend module at that version, as a nav entry does.
const munin = useMuninStore();
const available = ({ requiresModule, minVersion }) =>
  !requiresModule || (munin.isModuleEnabled(requiresModule) && (!minVersion || munin.isModuleAtLeast(requiresModule, minVersion)));
const readable = (section) => available(section) && access.can(router.resolve({ name: section.route }).meta.area);
const options = computed(() =>
  props.tabs.sections.filter(readable).map((section) => ({
    value: section.route,
    label: t(section.labelKey),
    testid: section.testid,
    count: (section.badge && counts.value[section.badge]) || null,
  }))
);
</script>
