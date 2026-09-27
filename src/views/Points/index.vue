<template>
  <div class="points-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
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
</style>
