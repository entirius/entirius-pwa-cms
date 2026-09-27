<template>
  <div class="builder-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div class="panel-toolbar__title flex ai-ct gap-8">
        <div id="builder-toolbar-left" class="flex ai-ct gap-5"></div>
      </div>
      <div id="builder-toolbar-right" class="panel-toolbar__actions flex ai-ct gap-5"></div>
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
</style>
