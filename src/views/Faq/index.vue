<template>
  <div class="faq-panel h-100">
    <div class="faq-panel__toolbar flex ai-ct jc-sb bg-raised fs-300">
      <div id="faq-toolbar-left" class="flex ai-ct gap-200"></div>
      <div id="faq-toolbar-right" class="flex ai-ct gap-200"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "FaqPanel",
};
</script>

<style lang="scss" scoped>
.faq-panel {
  display: flex;
  flex-direction: column;
}

.faq-panel__toolbar {
  padding: 8px 20px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
</style>
