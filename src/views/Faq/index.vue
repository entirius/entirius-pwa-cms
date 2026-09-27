<template>
  <div class="faq-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div id="faq-toolbar-left" class="flex ai-ct gap-5"></div>
      <div id="faq-toolbar-right" class="flex ai-ct gap-5"></div>
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
</style>
