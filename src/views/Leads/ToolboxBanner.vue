<template>
  <p v-if="text" class="toolbox-banner" :class="`toolbox-banner--${status}`" role="status" data-testid="toolbox-banner">
    {{ text }}
  </p>
</template>

<script setup>
import { computed } from "vue";
import { t } from "@/i18n";
import { useMuninStore } from "@/stores/munin";

// Toolbox teaser: unconfigured sells the toolbox, unreachable explains why AI actions may fail.
const munin = useMuninStore();
const status = computed(() => munin.toolboxStatus);
const text = computed(() =>
  ["unconfigured", "unreachable"].includes(status.value) ? t(`leads.toolbox.${status.value}`) : ""
);
</script>

<style scoped>
.toolbox-banner {
  margin: 0;
  padding: var(--space-200) var(--space-300);
  border-radius: 8px;
  background: var(--c-warning-100);
  color: var(--c-basic-800);
}
.toolbox-banner--unreachable {
  background: var(--c-negative-100);
}
</style>
