<template>
  <div class="authors-panel h-100">
    <div class="authors-panel__toolbar flex ai-ct jc-sb bg-raised fs-300">
      <div id="authors-toolbar-left" class="flex ai-ct gap-5"></div>
      <div id="authors-toolbar-right" class="flex ai-ct gap-5"></div>
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
  padding: var(--space-2) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
</style>
