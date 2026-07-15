<template>
  <div class="forms-panel h-100">
    <div class="forms-panel__toolbar flex ai-ct jc-sb bg-basic-200 fs-300">
      <div id="forms-toolbar-left" class="flex ai-ct gap-200"></div>
      <div id="forms-toolbar-right" class="flex ai-ct gap-200"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "ContactFormsPanel",
};
</script>

<style lang="scss" scoped>
.forms-panel {
  display: flex;
  flex-direction: column;
}

.forms-panel__toolbar {
  padding: 8px 20px;
  border-bottom: 1px solid var(--c-basic-300);
  flex-shrink: 0;
}
</style>
