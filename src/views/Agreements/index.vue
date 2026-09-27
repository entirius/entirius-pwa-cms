<template>
  <div class="agreements-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div id="agreements-toolbar-left" class="flex ai-ct gap-5"></div>
      <div id="agreements-toolbar-right" class="flex ai-ct gap-5"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "AgreementsPanel",
};
</script>

<style lang="scss" scoped>
.agreements-panel {
  display: flex;
  flex-direction: column;
}
</style>
