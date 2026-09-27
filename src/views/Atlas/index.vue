<template>
  <div class="suppliers-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div id="suppliers-toolbar-left" class="flex ai-ct gap-5"></div>
      <div id="suppliers-toolbar-right" class="flex ai-ct gap-5"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "SuppliersPanel",
};
</script>

<style lang="scss" scoped>
.suppliers-panel {
  display: flex;
  flex-direction: column;
}
</style>
