<template>
  <div class="builder-panel h-100">
    <div class="builder-panel__toolbar flex ai-ct jc-sb bg-raised fs-300">
      <div class="flex ai-ct gap-8">
        <div id="builder-toolbar-left" class="flex ai-ct gap-5"></div>
      </div>
      <div id="builder-toolbar-right" class="flex ai-ct gap-5"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "BuilderPanel",
};
</script>

<style lang="scss" scoped>
.builder-panel {
  display: flex;
  flex-direction: column;
}

.builder-panel__toolbar {
  padding: var(--space-2) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
</style>
