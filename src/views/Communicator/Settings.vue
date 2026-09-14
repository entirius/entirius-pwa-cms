<template>
  <div class="ld-page" data-testid="communicator-settings">
    <h2 class="ld-title">{{ $t("communicator.settings.title") }}</h2>
    <SettingsPolicy />
    <SettingsChannel />
    <SettingsSuppressions />
    <SettingsScheduled />
  </div>
</template>

<script setup>
import SettingsChannel from "./settings/SettingsChannel.vue";
import SettingsPolicy from "./settings/SettingsPolicy.vue";
import SettingsScheduled from "./settings/SettingsScheduled.vue";
import SettingsSuppressions from "./settings/SettingsSuppressions.vue";
</script>
