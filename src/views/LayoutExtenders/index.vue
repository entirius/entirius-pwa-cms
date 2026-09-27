<template>
  <div class="layout-extender-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
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
</style>
