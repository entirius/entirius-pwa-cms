<template>
  <div class="translation-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div class="panel-toolbar__title flex ai-ct gap-5">
        <div id="translation-toolbar-left" class="flex ai-ct gap-5"></div>
      </div>
      <div id="translation-toolbar-right" class="panel-toolbar__actions flex ai-ct gap-5"></div>
    </div>
    <router-view class="fs-300 t-body" />
  </div>
</template>

<script>
export default {
  name: "TranslationPanel",
};
</script>

<style lang="scss" scoped>
.translation-panel {
  display: flex;
  flex-direction: column;
}
</style>
