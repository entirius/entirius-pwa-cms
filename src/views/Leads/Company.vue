<template>
  <Thread v-if="!isDesktop" />
  <div v-else class="ld-page" data-testid="company-card">
    <header v-if="company" class="ld-row">
      <h2 class="ld-title" data-testid="company-domain">{{ company.domain }}</h2>
      <select
        class="ld-input"
        :value="company.stage.key"
        :aria-label="$t('leads.board.move_to')"
        data-testid="company-stage"
        @change="transition($event.target.value)"
      >
        <option v-for="stage in stages" :key="stage.key" :value="stage.key">{{ stage.label }}</option>
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
import { GET_Company, GET_Stages, POST_Transition } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useIsDesktop } from "@/composables/useIsDesktop";
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

const tab = computed(() => (TABS.includes(route.query.tab) ? route.query.tab : "overview"));
const tabOptions = TABS.map((value) => ({ value, label: t(`leads.company.tabs.${value}`), testid: `company-tab-${value}` }));

function openTab(value) {
  router.replace({ query: { ...route.query, tab: value } });
}

async function load() {
  const [companyRes, stageRes] = await Promise.all([GET_Company(route.params.id), GET_Stages()]);
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

watch(
  () => [isDesktop.value, route.params.id],
  ([desktop, id]) => desktop && id && load(),
  { immediate: true }
);
</script>

<style src="./desktop.css"></style>
