<template>
  <Thread v-if="!isDesktop" desktop-hint />
  <div v-else class="ld-page" data-testid="company-card">
    <header v-if="company" class="ld-row">
      <div class="ld-field">
        <h2 class="ld-title" data-testid="thread-company">{{ company.name }}</h2>
        <span class="ld-muted" data-testid="company-domain">{{ company.domain }}</span>
      </div>
      <select
        class="ld-input"
        :value="company.stage.key"
        :aria-label="$t('leads.board.move_to')"
        data-testid="company-stage"
        @change="transition($event.target.value)"
      >
        <option v-for="stage in stages" :key="stage.key" :value="stage.key">{{ stage.label }}</option>
      </select>
      <select
        class="ld-input"
        :value="company.lead_type"
        :aria-label="$t('leads.company.type')"
        data-testid="company-lead-type"
        @change="retype($event.target.value)"
      >
        <option value="UNKNOWN">{{ $t("leads.lead_types.unknown") }}</option>
        <option v-for="type in typeOptions" :key="type.code" :value="type.code">{{ type.label }}</option>
      </select>
      <span v-if="company.do_not_contact" class="ld-badge" data-testid="company-dnc-badge">
        {{ $t("leads.company.do_not_contact") }}
      </span>
      <CompanyActions :company="company" @changed="load" />
    </header>
    <SegmentedControl :options="tabOptions" :model-value="tab" @update:model-value="openTab" />
    <template v-if="company">
      <OverviewTab v-if="tab === 'overview'" :company="company" />
      <IntelTab v-else-if="tab === 'intel'" :company="company" />
      <ContactsTab v-else-if="tab === 'contacts'" :company="company" />
      <Thread v-else />
    </template>
  </div>
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

// Company card: the plan-13 thread on a phone; header, stage picker, actions and tabs from 1024 px.
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
  return own ? [...leadTypes.active, { code, label: leadTypes.label(code) }] : leadTypes.active;
});

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

<style src="./desktop.css"></style>
