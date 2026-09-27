<template>
  <div class="forms-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div id="forms-toolbar-left" class="flex ai-ct gap-5"></div>
      <div id="forms-toolbar-right" class="flex ai-ct gap-5"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "ContactFormsPanel",
};
</script>

<style lang="scss" scoped>
.forms-panel {
  display: flex;
  flex-direction: column;
}
</style>
