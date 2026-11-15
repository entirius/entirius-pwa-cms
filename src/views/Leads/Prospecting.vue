<template>
  <PageLayout data-testid="leads-prospecting">
    <template #header>
      <PageHeader :title="$t('leads.prospecting.title')" />
    </template>
    <div class="flex-column gap-5" data-testid="prospecting-people">
      <p class="t-secondary m-0">{{ $t("leads.prospecting.people_help") }}</p>
      <BasicSelect v-model="status" class="prospecting__status" :floating-label="$t('leads.prospecting.status_filter')" :options="statusOptions" data-testid="prospecting-status" />
      <CandidateList :status="status" />
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, ref } from "vue";
import { t } from "@/i18n";
import CandidateList from "./prospecting/CandidateList.vue";

// U3 Prospecting: the candidates of every company, waiting ones first. Finding new companies is not built, so it has no
// tab: the page is People.
const status = ref("pending");
const statusOptions = computed(() => [
  { value: "pending", label: t("leads.prospecting.status.pending") },
  { value: "accepted", label: t("leads.prospecting.status.accepted") },
  { value: "rejected", label: t("leads.prospecting.status.rejected") },
  { value: "", label: t("leads.prospecting.status.all") },
]);
</script>

<style scoped>
.prospecting__status {
  max-width: 16rem;
}
</style>
