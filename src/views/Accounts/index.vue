<template>
  <div class="accounts-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div id="accounts-toolbar-left" class="flex ai-ct gap-5"></div>
      <div id="accounts-toolbar-right" class="flex ai-ct gap-5"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "AccountsPanel",
};
</script>

<style lang="scss" scoped>
.accounts-panel {
  display: flex;
  flex-direction: column;
}
</style>
