<template>
  <div class="translation-panel h-100">
    <div class="translation-panel__toolbar flex ai-ct jc-sb bg-basic-200 fs-300">
      <div class="flex ai-ct gap-200">
        <div id="translation-toolbar-left" class="flex ai-ct gap-200"></div>
        <span class="fw-600 t-basic-800">{{ $t("translation.jobs") }}</span>
      </div>
      <div id="translation-toolbar-right" class="flex ai-ct gap-200"></div>
    </div>
    <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
      <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
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

.translation-panel__toolbar {
  padding: 8px 20px;
  border-bottom: 1px solid var(--c-basic-300);
  flex-shrink: 0;
}

@media only screen and (max-width: 768px) {
  .translation-panel__toolbar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
  }
}
</style>
