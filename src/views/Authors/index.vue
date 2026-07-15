<template>
  <div class="authors-panel h-100">
    <div class="authors-panel__toolbar flex ai-ct jc-sb bg-basic-200 fs-300">
      <div id="authors-toolbar-left" class="flex ai-ct gap-200"></div>
      <div id="authors-toolbar-right" class="flex ai-ct gap-200"></div>
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

.authors-panel__toolbar {
  padding: 8px 20px;
  border-bottom: 1px solid var(--c-basic-300);
  flex-shrink: 0;
}
</style>
