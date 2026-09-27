<template>
  <div class="authors-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div id="authors-toolbar-left" class="flex ai-ct gap-5"></div>
      <div id="authors-toolbar-right" class="panel-toolbar__actions flex ai-ct gap-5"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "AuthorsPanel",
};
</script>

<style lang="scss" scoped>
.authors-panel {
  display: flex;
  flex-direction: column;
}
</style>
