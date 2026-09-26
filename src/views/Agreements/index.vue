<template>
  <div class="agreements-panel h-100">
    <div class="agreements-panel__toolbar flex ai-ct jc-sb bg-raised fs-300">
      <div id="agreements-toolbar-left" class="flex ai-ct gap-200"></div>
      <div id="agreements-toolbar-right" class="flex ai-ct gap-200"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "AgreementsPanel",
};
</script>

<style lang="scss" scoped>
.agreements-panel {
  display: flex;
  flex-direction: column;
}

.agreements-panel__toolbar {
  padding: 8px 20px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
</style>
