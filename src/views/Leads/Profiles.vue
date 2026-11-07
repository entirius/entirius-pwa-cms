<template>
  <PageLayout data-testid="leads-profiles">
    <template #header>
      <PageHeader :title="$t('leads.profiles.title')" :back="{ name: 'LeadsSettings' }" />
    </template>
    <div class="flex-column gap-8">
      <p class="t-muted m-0">{{ $t("leads.profiles.help") }}</p>
      <ProfileSection kind="analysis-profiles" :has-active="true" :title="$t('leads.profiles.analysis')" />
      <ProfileSection kind="recipient-profiles" :has-active="false" :title="$t('leads.profiles.recipient')" />
    </div>
  </PageLayout>
</template>

<script setup>
import ProfileSection from "./ProfileSection.vue";

// Leads → Settings → Analysis and recipient profiles (S5): the prompts the analysis and the recipient pick run on.
</script>
