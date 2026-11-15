<template>
  <PageLayout data-testid="leads-prospecting">
    <template #header>
      <PageHeader :title="$t('leads.prospecting.title')" />
    </template>
    <template #toolbar>
      <BasicTabs id-prefix="prospecting" :options="tabOptions" :model-value="tab" data-testid="prospecting-tabs" @update:model-value="openTab" />
    </template>
    <div v-if="tab === 'people'" class="flex-column gap-5" data-testid="prospecting-people">
      <p class="t-secondary m-0">{{ $t("leads.prospecting.people_help") }}</p>
      <BasicSelect v-model="status" class="prospecting__status" :floating-label="$t('leads.prospecting.status_filter')" :options="statusOptions" data-testid="prospecting-status" />
      <CandidateList :status="status" />
    </div>
    <div v-else class="flex-column gap-5" data-testid="prospecting-companies">
      <EmptyState icon="empty" size="md" :title="$t('leads.prospecting.companies_title')" :message="$t('leads.prospecting.companies_help')" data-testid="prospecting-companies-placeholder" />
      <DataTable v-if="companies.length" :columns="companyColumns" :rows="companies" row-key="id" data-testid="prospecting-companies-table" />
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_ProspectCompanies } from "@/api/prospecting/api";
import CandidateList from "./prospecting/CandidateList.vue";

// U3 Prospecting: People (candidates of every company, waiting ones first) and Companies — a placeholder: finding new
// companies is not built yet, the list holds companies added by hand.
const route = useRoute();
const router = useRouter();
const TAB_ROUTES = { people: "LeadsProspectingPeople", companies: "LeadsProspectingCompanies" };
const tab = computed(() => (route.name === TAB_ROUTES.companies ? "companies" : "people"));
const tabOptions = computed(() => [
  { value: "people", label: t("leads.prospecting.tabs.people"), testid: "prospecting-tab-people" },
  { value: "companies", label: t("leads.prospecting.tabs.companies"), testid: "prospecting-tab-companies" },
]);
const openTab = (value) => router.push({ name: TAB_ROUTES[value] });

const status = ref("pending");
const statusOptions = computed(() => [
  { value: "pending", label: t("leads.prospecting.status.pending") },
  { value: "accepted", label: t("leads.prospecting.status.accepted") },
  { value: "rejected", label: t("leads.prospecting.status.rejected") },
  { value: "", label: t("leads.prospecting.status.all") },
]);

const companies = ref([]);
const companyColumns = [
  { key: "name", label: t("leads.prospecting.col_name"), width: "1fr" },
  { key: "domain", label: t("leads.prospecting.col_domain") },
];
async function loadCompanies() {
  try {
    companies.value = (await GET_ProspectCompanies()).data.results;
  } catch {
    companies.value = [];
  }
}
watch(tab, (value) => value === "companies" && loadCompanies(), { immediate: true });
</script>

<style scoped>
.prospecting__status {
  max-width: 16rem;
}
</style>
