<template>
  <DesktopOnly>
    <div class="communicator" data-testid="communicator-layout">
      <router-view />
    </div>
  </DesktopOnly>
</template>

<script setup>
import DesktopOnly from "@/views/Leads/DesktopOnly.vue";
</script>

<style scoped>
.communicator {
  padding: var(--space-300);
  max-width: 1200px;
}
</style>
