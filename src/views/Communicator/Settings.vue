<template>
  <PageLayout data-testid="communicator-settings">
    <template #header>
      <PageHeader :title="$t('communicator.settings.title')" :back="{ name: 'LeadsSettings' }" />
    </template>
    <div class="flex-column gap-8">
      <SettingsPolicy />
      <SettingsChannel />
      <SettingsFooter />
      <SettingsScheduled />
      <!-- communicator >= 0.5.0: the list moved to Settings → Do not contact -->
      <SettingsSuppressions v-if="!outbound" />
    </div>
  </PageLayout>
</template>

<script setup>
import { computed } from "vue";
import { useMuninStore } from "@/stores/munin";
import { outboundOn } from "@/utils/leadsOutbound";
import SettingsChannel from "./settings/SettingsChannel.vue";
import SettingsFooter from "./settings/SettingsFooter.vue";
import SettingsPolicy from "./settings/SettingsPolicy.vue";
import SettingsScheduled from "./settings/SettingsScheduled.vue";
import SettingsSuppressions from "./settings/SettingsSuppressions.vue";

const munin = useMuninStore();
const outbound = computed(() => outboundOn(munin, "communicator"));
</script>
