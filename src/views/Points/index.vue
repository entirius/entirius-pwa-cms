<template>
  <div class="points-panel h-100">
    <div class="points-panel__toolbar flex ai-ct jc-sb bg-raised fs-300">
      <div id="points-toolbar-left" class="flex ai-ct gap-5"></div>
      <div id="points-toolbar-right" class="flex ai-ct gap-5"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "PointsPanel",
};
</script>

<style lang="scss" scoped>
.points-panel {
  display: flex;
  flex-direction: column;
}

.points-panel__toolbar {
  padding: var(--space-2) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
</style>
