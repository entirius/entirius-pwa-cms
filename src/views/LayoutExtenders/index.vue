<template>
  <div class="layout-extender-panel h-100">
    <div class="layout-extender-panel__toolbar flex ai-ct jc-sb bg-basic-200 fs-300">
      <div class="flex ai-ct gap-300">
        <div id="layout-extender-toolbar-left" class="flex ai-ct gap-200"></div>
      </div>
      <div id="layout-extender-toolbar-right" class="flex ai-ct gap-200"></div>
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
  padding: 8px 20px;
  border-bottom: 1px solid var(--c-basic-300);
  flex-shrink: 0;
}
</style>
