<template>
  <div class="accounts-panel h-100">
    <div class="accounts-panel__toolbar flex ai-ct jc-sb bg-basic-200 fs-300">
      <div id="accounts-toolbar-left" class="flex ai-ct gap-200"></div>
      <div id="accounts-toolbar-right" class="flex ai-ct gap-200"></div>
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
  padding: 8px 20px;
  border-bottom: 1px solid var(--c-basic-300);
  flex-shrink: 0;
}
</style>
