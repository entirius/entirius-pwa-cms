<template>
  <div class="suppliers-panel h-100">
    <div class="suppliers-panel__toolbar flex ai-ct jc-sb bg-basic-200 fs-300">
      <div id="suppliers-toolbar-left" class="flex ai-ct gap-200"></div>
      <div id="suppliers-toolbar-right" class="flex ai-ct gap-200"></div>
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

.suppliers-panel__toolbar {
  padding: 8px 20px;
  border-bottom: 1px solid var(--c-basic-300);
  flex-shrink: 0;
}
</style>
