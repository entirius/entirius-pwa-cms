<template>
  <div class="accounts-panel h-100">
    <div class="accounts-panel__toolbar flex ai-ct jc-sb bg-raised fs-300">
      <div id="accounts-toolbar-left" class="flex ai-ct gap-5"></div>
      <div id="accounts-toolbar-right" class="flex ai-ct gap-5"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "AccountsPanel",
};
</script>

<style lang="scss" scoped>
.accounts-panel {
  display: flex;
  flex-direction: column;
}

.accounts-panel__toolbar {
  padding: var(--space-2) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
</style>
