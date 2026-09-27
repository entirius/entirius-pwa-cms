<template>
  <div class="translation-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div class="flex ai-ct gap-5">
        <div id="translation-toolbar-left" class="flex ai-ct gap-5"></div>
        <span class="fw-600 t-body">{{ $t("translation.jobs") }}</span>
      </div>
      <div id="translation-toolbar-right" class="flex ai-ct gap-5"></div>
    </div>
    <div class="page-pad fs-300 t-body h-100 ov-h">
      <div class="page-card h-100 ovy-auto">
        <router-view />
      </div>
    </div>
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
