<template>
  <Thread v-if="!isDesktop" desktop-hint />
  <PageLayout v-else data-testid="company-card">
    <template v-if="company" #header>
      <PageHeader :title="$t('leads.company.title')">
        <template #actions>
          <CompanyActions :company="company" @changed="load" />
        </template>
      </PageHeader>
    </template>
    <Loader v-if="!company" block />
    <template v-else>
      <header class="company__head flex ai-fe wrap gap-5">
        <div class="company__name flex-column gap-1">
          <h2 class="fs-500 fw-600 m-0" data-testid="thread-company">{{ company.name }}</h2>
          <span class="t-muted fs-200" data-testid="company-domain">{{ company.domain }}</span>
        </div>
        <StatusBadge
          v-if="company.do_not_contact"
          tone="negative"
          :label="$t('leads.company.do_not_contact')"
          data-testid="company-dnc-badge"
        />
        <div class="company__selects flex ai-fe wrap gap-3">
          <BasicSelect
            class="company__select"
            :model-value="company.stage.key"
            :options="stageOptions"
            :floating-label="$t('leads.company.stage')"
            data-testid="company-stage"
            @update:model-value="transition"
          />
          <BasicSelect
            class="company__select"
            :model-value="company.lead_type"
            :options="typeOptions"
            :floating-label="$t('leads.company.type')"
            data-testid="company-lead-type"
            @update:model-value="retype"
          />
        </div>
      </header>
      <BasicTabs class="company__tabs" id-prefix="company" :options="tabOptions" :model-value="tab" @update:model-value="openTab" />
      <div :id="`company-panel-${tab}`" role="tabpanel" :aria-labelledby="`company-tab-${tab}`">
        <OverviewTab v-if="tab === 'overview'" :company="company" />
        <IntelTab v-else-if="tab === 'intel'" :company="company" />
        <ContactsTab v-else-if="tab === 'contacts'" :company="company" @changed="load" />
        <Thread v-else />
      </div>
    </template>
  </PageLayout>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_Company, GET_Stages, PATCH_Company, POST_Transition } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useIsDesktop } from "@/composables/useIsDesktop";
import { useLeadTypesStore } from "@/stores/leadTypes";
import { useNotifyStore } from "@/stores/notify";
import CompanyActions from "./CompanyActions.vue";
import Thread from "./Thread.vue";
import ContactsTab from "./tabs/ContactsTab.vue";
import IntelTab from "./tabs/IntelTab.vue";
import OverviewTab from "./tabs/OverviewTab.vue";

// Company card: the plan-13 thread on a phone; from 1024 px the page frame (actions in the PageHeader), the card
// header (name, domain, stage and lead-type selects) and the tabs.
const TABS = ["overview", "intel", "contacts", "timeline"];
const route = useRoute();
const router = useRouter();
const notify = useNotifyStore();
const isDesktop = useIsDesktop();
const company = ref(null);
const stages = ref([]);
const leadTypes = useLeadTypesStore();
// The active types, plus the company's own type when it was deactivated since (it still reads, it is not offered).
const typeOptions = computed(() => {
  const code = company.value?.lead_type;
  const own = code && code !== "UNKNOWN" && !leadTypes.active.some((type) => type.code === code);
  const types = own ? [...leadTypes.active, { code, label: leadTypes.label(code) }] : leadTypes.active;
  return [
    { value: "UNKNOWN", label: t("leads.lead_types.unknown") },
    ...types.map((type) => ({ value: type.code, label: type.label })),
  ];
});
const stageOptions = computed(() => stages.value.map((stage) => ({ value: stage.key, label: stage.label })));

const tab = computed(() => (TABS.includes(route.query.tab) ? route.query.tab : "overview"));
const tabOptions = TABS.map((value) => ({ value, label: t(`leads.company.tabs.${value}`), testid: `company-tab-${value}` }));

function openTab(value) {
  router.replace({ query: { ...route.query, tab: value } });
}

async function load() {
  const [companyRes, stageRes] = await Promise.all([GET_Company(route.params.id), GET_Stages(), leadTypes.load()]);
  company.value = companyRes.data;
  stages.value = stageRes.data.results;
}

async function transition(stageKey) {
  try {
    company.value = (await POST_Transition(company.value.id, stageKey)).data;
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.board.move_failed")), type: "negative" });
    await load();
  }
}

async function retype(code) {
  try {
    company.value = (await PATCH_Company(company.value.id, { lead_type: code })).data;
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.review.error")), type: "negative" });
    await load();
  }
}

watch(
  () => [isDesktop.value, route.params.id],
  ([desktop, id]) => desktop && id && load(),
  { immediate: true }
);
</script>

<style scoped>
.company__head {
  margin-bottom: var(--space-6);
}
.company__name {
  flex: 1 1 16rem;
  min-width: 0;
  overflow-wrap: anywhere;
}
.company__select {
  width: 14rem;
}
.company__tabs {
  margin-bottom: var(--space-6);
}
</style>
