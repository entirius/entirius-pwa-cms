<template>
  <div class="layout-extender-panel h-100">
    <div class="layout-extender-panel__toolbar flex ai-ct jc-sb bg-raised fs-300">
      <div class="flex ai-ct gap-8">
        <div id="layout-extender-toolbar-left" class="flex ai-ct gap-5"></div>
      </div>
      <div id="layout-extender-toolbar-right" class="flex ai-ct gap-5"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "LayoutExtenderPanel",
};
</script>

<style lang="scss" scoped>
.layout-extender-panel {
  display: flex;
  flex-direction: column;
}

.layout-extender-panel__toolbar {
  padding: var(--space-2) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
</style>
